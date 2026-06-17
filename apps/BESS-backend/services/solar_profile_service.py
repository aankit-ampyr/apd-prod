from __future__ import annotations

import json
import math
import traceback
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4
import io

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from constants.defaults import STATIC_INPUTS_DIR, STATIC_SOLAR_PROFILES
from constants.enums import SimulationLogStep, SimulationSetupProgress
from dtos.solar_profile_dto import SolarProfileComputeRequest
from models import SolarProfileSource, LoadProfile, SolarProfileConfig
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from utils import FileStorageManager, Res
from utils.log_utils import audit_logs
from .service_support import (
    depreciate_simulation_job,
    ensure_simulation_write_access,
    progress_simulation_setup,
)


@dataclass(frozen=True)
class ParsedSolarProfile:
    timestamps: list[datetime]
    solar_generation: list[float]  # MW per hour
    year: int


class SolarProfileService:
    EXPECTED_HOURS_PER_YEAR = 8760
    HOURS_A_DAY = 24
    ROW_COUNT_REQUIREMENT_MESSAGE = (
        "CSV file must contain exactly 8760 rows (hourly data for a full year)"
    )

    # Expected CSV columns (case-insensitive matching)
    _TIMESTAMP_KEYS = {"timestamp", "time", "date_time", "datetime"}
    _SOLAR_KEYS = {"solar generation", "solar_generation", "solar", "generation"}

    def _validate_csv_for_upload(self, csv_bytes: bytes) -> tuple[int, int]:
        """
        Fast validation path for upload endpoint.
        Keeps checks strict, but avoids expensive per-row datetime parsing.
        Returns validated (row count, year).
        """
        try:
            df = pd.read_csv(
                io.BytesIO(csv_bytes),
                encoding="utf-8-sig",
                sep=None,
                engine="python",
            )

            if df.empty or len(df.columns) == 0:
                raise ValueError("E-20017: Invalid CSV structure/content")

            df.columns = (
                df.columns.str.strip().str.lower().str.replace("_", " ", regex=False)
            )

            timestamp_col = None
            for col in df.columns:
                if any(key in col for key in self._TIMESTAMP_KEYS):
                    timestamp_col = col
                    break

            solar_col = None
            for col in df.columns:
                if any(key in col for key in self._SOLAR_KEYS):
                    solar_col = col
                    break

            if not timestamp_col or not solar_col:
                raise ValueError("E-20017: Invalid CSV structure/content")

            if len(df) != self.EXPECTED_HOURS_PER_YEAR:
                raise ValueError(f"E-20035: {self.ROW_COUNT_REQUIREMENT_MESSAGE}")

            df = df.dropna(subset=[timestamp_col, solar_col])
            if len(df) != self.EXPECTED_HOURS_PER_YEAR:
                raise ValueError(f"E-20035: {self.ROW_COUNT_REQUIREMENT_MESSAGE}")

            # Keep upload validation aligned with compute path:
            # reject files that do not follow expected timestamp format.
            parsed_timestamps = pd.to_datetime(
                df[timestamp_col], format="%d-%m-%Y %H:%M", errors="coerce"
            )
            if parsed_timestamps.isna().any():
                raise ValueError("E-20017: Invalid CSV structure/content")

            # Extract year from the first valid timestamp
            year = int(parsed_timestamps.iloc[0].year)

            df[solar_col] = pd.to_numeric(df[solar_col], errors="coerce")
            if df[solar_col].isna().any():
                raise ValueError("E-20017: Invalid CSV structure/content")
            if not df[solar_col].apply(math.isfinite).all():
                raise ValueError("E-20017: Invalid CSV structure/content")
            if (df[solar_col] < 0).any():
                raise ValueError("E-20022: Negative solar generation found")

            return int(len(df)), year
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"E-20019: Failed to parse CSV: {e}")

    def _parse_csv_bytes(self, csv_bytes: bytes) -> ParsedSolarProfile:
        """
        Parse CSV bytes using pandas and extract:
          - Timestamp
          - Solar Generation (MW)

        Returns ParsedSolarProfile or raises ValueError with a mapped error code.
        """
        try:
            # Use pandas to read CSV with automatic delimiter detection
            df = pd.read_csv(
                io.BytesIO(csv_bytes),
                encoding="utf-8-sig",
                sep=None,  # Auto-detect delimiter
                engine="python",
            )

            if df.empty or len(df.columns) == 0:
                raise ValueError("E-20017: Invalid CSV structure/content")

            # Normalize column names for matching
            df.columns = (
                df.columns.str.strip().str.lower().str.replace("_", " ", regex=False)
            )

            # Find timestamp column
            timestamp_col = None
            for col in df.columns:
                if any(key in col for key in self._TIMESTAMP_KEYS):
                    timestamp_col = col
                    break

            # Find solar generation column
            solar_col = None
            for col in df.columns:
                if any(key in col for key in self._SOLAR_KEYS):
                    solar_col = col
                    break

            if not timestamp_col or not solar_col:
                raise ValueError("E-20017: Invalid CSV structure/content")

            # Enforce exact hourly row count for one full year.
            if len(df) != self.EXPECTED_HOURS_PER_YEAR:
                raise ValueError(f"E-20035: {self.ROW_COUNT_REQUIREMENT_MESSAGE}")

            # Drop rows with missing values in required columns
            df = df.dropna(subset=[timestamp_col, solar_col])

            parsed_timestamps = pd.to_datetime(
                df[timestamp_col], format="%d-%m-%Y %H:%M", errors="coerce"
            )
            if parsed_timestamps.isna().any():
                raise ValueError("E-20017: Invalid CSV structure/content")
            df["parsed_timestamp"] = parsed_timestamps

            # Parse solar generation as float
            df[solar_col] = pd.to_numeric(df[solar_col], errors="coerce")
            df = df.dropna(subset=[solar_col])

            # Invalid/empty cells can reduce effective rows; keep same strict message.
            if len(df) != self.EXPECTED_HOURS_PER_YEAR:
                raise ValueError(f"E-20035: {self.ROW_COUNT_REQUIREMENT_MESSAGE}")

            # Check for non-finite values
            if not df[solar_col].apply(math.isfinite).all():
                raise ValueError("E-20017: Invalid CSV structure/content")

            # Check for negative solar generation
            if (df[solar_col] < 0).any():
                raise ValueError("E-20022: Negative solar generation found")

            timestamps = df["parsed_timestamp"].tolist()
            solar_generation = df[solar_col].tolist()
            year = int(df["parsed_timestamp"].iloc[0].year)

            return ParsedSolarProfile(
                timestamps=timestamps,
                solar_generation=solar_generation,
                year=year,
            )

        except ValueError as ve:
            msg = str(ve)
            if msg.startswith("E-"):
                raise
            raise ValueError("E-20017: Invalid CSV structure/content")
        except Exception as e:
            raise ValueError(f"E-20019: Failed to parse CSV: {e}")

    def _parse_csv_value_error_response(self, ve: ValueError):
        err = str(ve)
        if err.startswith("E-20022"):
            return Res.error(
                status_code="E-20022",
                message="Negative solar generation found",
                http_status_code=400,
            )
        if err.startswith("E-20035"):
            return Res.error(
                status_code="E-20035",
                message=self.ROW_COUNT_REQUIREMENT_MESSAGE,
                http_status_code=400,
            )
        if err.startswith("E-20017"):
            return Res.error(
                status_code="E-20020",
                message="Invalid file format for the solar profile calculation. Please upload a valid CSV file and try again.",
                http_status_code=400,
            )
        if err.startswith("E-20019"):
            return Res.error(
                status_code="E-20019",
                message="Failed to parse CSV",
                http_status_code=400,
            )
        return Res.error(
            status_code="E-20019",
            message="Failed to parse CSV",
            http_status_code=400,
        )

    def _download_bytes(self, source: SolarProfileSource) -> bytes:
        """
        Download a stored solar profile CSV using FileStorageManager.
        Uses the 'key' field which contains the full storage path.
        """
        content, _content_type = FileStorageManager.get_file_object(source.key)
        return content

    def _read_static_csv_bytes(self, source_id: int) -> tuple[bytes, str]:
        """
        Read a static CSV file from the inputs/ directory for testing.
        Uses STATIC_SOLAR_PROFILES mapping to find the file.

        Args:
            source_id: The static source ID to look up in the mapping.

        Returns:
            Tuple of (file_bytes, filename) if found.

        Raises:
            FileNotFoundError: If source_id is not in mapping or file doesn't exist.
        """
        if source_id not in STATIC_SOLAR_PROFILES:
            raise FileNotFoundError(
                f"Static source_id {source_id} not found in mapping"
            )

        filename = STATIC_SOLAR_PROFILES[source_id]
        base_dir = Path(__file__).resolve().parent.parent  # BESS-backend root
        file_path = base_dir / STATIC_INPUTS_DIR / filename

        if not file_path.exists():
            raise FileNotFoundError(f"Static file not found: {file_path}")

        with open(file_path, "rb") as f:
            return f.read(), filename

    def _compute_metrics(
        self, parsed: ParsedSolarProfile, load_series: list[float]
    ) -> dict[str, Any]:
        """
        Compute solar profile metrics using pandas for efficient computation.
        """
        # Create DataFrame for efficient computation
        df = pd.DataFrame(
            {
                "timestamp": parsed.timestamps,
                "solar": parsed.solar_generation,
                "load": load_series,
            }
        )

        if len(df) != self.EXPECTED_HOURS_PER_YEAR:
            raise ValueError("Load series length mismatch")

        # Basic metrics
        total_generation = float(df["solar"].sum())
        peak_generation = float(df["solar"].max())
        avg_generation = float(df["solar"].mean())
        generation_hours = int((df["solar"] > 0).sum())

        # Storable calculations
        df["storable"] = (df["solar"] - df["load"]).clip(lower=0)
        df["excess"] = df["solar"] > df["load"]

        max_storable = float(df["storable"].max())
        excess_hours = int(df["excess"].sum())
        total_storable = float(
            df.loc[df["excess"], "solar"].sum() - df.loc[df["excess"], "load"].sum()
        )

        hours_at_max = int((df["solar"] - df["load"] >= (max_storable * 0.99)).sum())
        max_available = (hours_at_max / excess_hours) * 100 if excess_hours > 0 else 0

        # Timestamp is already normalized during CSV parse.
        df["hour"] = df["timestamp"].apply(lambda x: x.hour)
        df["month"] = df["timestamp"].apply(lambda x: x.month)

        # Hourly graph: average solar generation by hour of day
        hourly_avg = df.groupby("hour")["solar"].mean()
        hourly_generation_graph_points = [
            {"hour": h, "value": float(hourly_avg.get(h, 0.0))} for h in range(24)
        ]

        # Monthly graph: total solar generation by month
        monthly_sum = df.groupby("month")["solar"].sum()
        monthly_generation_graph_points = [
            {"month": m, "value": float(monthly_sum.get(m, 0.0))} for m in range(1, 13)
        ]

        # Storable solar graph points (hourly for entire year)
        storable_solar_graph_points = [
            {"hour": i, "value": float(v)}
            for i, v in enumerate(df["storable"].tolist())
        ]

        return {
            "total_generation": total_generation,
            "peak_generation": peak_generation,
            "avg_generation": avg_generation,
            "generation_hours": generation_hours,
            "max_storable": max_storable,
            "excess_hours": excess_hours,
            "total_storable": total_storable,
            "hours_at_max": hours_at_max,
            "max_available": max_available,
            "hourly_generation_graph_points": hourly_generation_graph_points,
            "monthly_generation_graph_points": monthly_generation_graph_points,
            "storable_solar_graph_points": storable_solar_graph_points,
        }

    async def _get_load_series(
        self, bess_db: AsyncSession, simulation_id: int
    ) -> list[float]:
        """
        Build the 8760-hour Load series for the given simulation_id by repeating
        the stored 24-hour daily schedule from LoadProfile.graph_data_points.
        """
        result = await bess_db.execute(
            select(LoadProfile).where(LoadProfile.simulation_id == simulation_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            raise ValueError("Load profile not found for simulation")

        # graph_data_points is already a list of 24 floats
        daily_schedule = record.graph_data_points

        if not isinstance(daily_schedule, list) or len(daily_schedule) != 24:
            raise ValueError("Invalid stored load schedule")

        validated_schedule: list[float] = []
        for v in daily_schedule:
            fv = float(v)
            if not math.isfinite(fv):
                raise ValueError("Invalid stored load schedule (non-finite values)")
            validated_schedule.append(fv)

        return [
            validated_schedule[i % self.HOURS_A_DAY]
            for i in range(self.EXPECTED_HOURS_PER_YEAR)
        ]

    async def upload_solar_profile_csv(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        file: UploadFile,
        current_user: dict,
    ):
        try:
            simulation, auth_error = await ensure_simulation_write_access(
                db=bess_db, simulation_id=simulation_id, current_user=current_user
            )
            if auth_error:
                return auth_error

            file_bytes = await file.read()
            size_bytes = len(file_bytes)

            # 200MB limit
            if size_bytes > 200 * 1024 * 1024:
                return Res.error(
                    status_code="E-20021",
                    message="File size exceeds 200MB limit",
                    http_status_code=400,
                )

            # Fast upload-time validation (exact row count + structural checks).
            try:
                validated_rows, extracted_year = self._validate_csv_for_upload(
                    file_bytes
                )
            except ValueError as ve:
                return self._parse_csv_value_error_response(ve)

            original_name = file.filename or "solar_profile.csv"
            existing_file_query = await bess_db.execute(
                select(SolarProfileSource).where(
                    SolarProfileSource.simulation_id == simulation_id,
                    SolarProfileSource.name == original_name,
                )
            )
            existing_file = existing_file_query.scalar_one_or_none()
            if existing_file:
                return Res.error(
                    status_code="E-20049",
                    message="Duplicate file not accepted",
                    http_status_code=400,
                )

            stored_suffix = uuid4().hex
            stored_file_name = f"{stored_suffix}-{original_name}"

            storage_path = f"solar-profile/simulation-{simulation_id}/"
            storage_key = f"{storage_path}{stored_file_name}"

            # Upload to object storage using FileStorageManager
            FileStorageManager.upload_file(
                file_data=file_bytes,
                file_name=stored_file_name,
                path=storage_path,
                is_encrypted=False,
            )

            record = SolarProfileSource(
                key=storage_key,
                name=original_name,
                size=size_bytes,
                rows=validated_rows,
                year=extracted_year,
                simulation_id=simulation_id,
            )
            bess_db.add(record)
            await bess_db.commit()
            await bess_db.refresh(record)

            data = {
                "key": record.key,
                "size": record.size,
                "rows": record.rows,
                "year": record.year,
                "name": record.name,
                "id": record.id,
            }
            return Res.success("S-20005", data=data, http_status_code=200)
        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error(
                status_code="E-20001",
                message="Unable to upload solar profile CSV",
                http_status_code=500,
            )

    async def compute_solar_profile(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        payload: SolarProfileComputeRequest,
        current_user: dict,
        resource_id: str = None,
        is_saved: bool = False,
    ):
        try:
            simulation, auth_error = await ensure_simulation_write_access(
                db=bess_db, simulation_id=simulation_id, current_user=current_user
            )
            if auth_error:
                return auth_error

            source_type = payload.type  # "static" | "file"
            source_id = payload.source_id

            # For static mode (testing): read CSV from inputs/ directory
            # For file mode: fetch from database storage
            if source_type == "static":
                try:
                    file_bytes, filename = self._read_static_csv_bytes(source_id)
                    file_size = len(file_bytes)
                    # Parse to get row count for metadata
                    try:
                        parsed = self._parse_csv_bytes(file_bytes)
                    except ValueError as ve:
                        return self._parse_csv_value_error_response(ve)
                    # Build source metadata for static mode
                    source_metadata = {
                        "name": filename,
                        "size": file_size,
                        "rows": len(parsed.timestamps),
                        "year": parsed.year,
                    }
                except FileNotFoundError:
                    return Res.error(
                        status_code="E-20023",
                        message="Static solar profile source not found",
                        http_status_code=404,
                    )
            else:
                # File mode: Query by source_id from database
                query = select(SolarProfileSource).where(
                    SolarProfileSource.id == source_id,
                )
                result = await bess_db.execute(query)
                source = result.scalar_one_or_none()

                if not source:
                    return Res.error(
                        status_code="E-20019",
                        message="Uploaded solar profile source not found",
                        http_status_code=404,
                    )

                file_bytes = self._download_bytes(source)

                try:
                    parsed = self._parse_csv_bytes(file_bytes)
                except ValueError as ve:
                    return self._parse_csv_value_error_response(ve)
                # Build source metadata from DB record
                source_metadata = {
                    "name": source.name,
                    "size": source.size,
                    "rows": source.rows,
                    "year": source.year,
                }

            try:
                load_series = await self._get_load_series(
                    bess_db=bess_db, simulation_id=simulation_id
                )
            except ValueError:
                # LLD expects load profile to exist for simulation-based computations.
                return Res.error(
                    status_code="E-20019",
                    message="Load profile not found for the given simulation",
                    http_status_code=404,
                )
            computed = self._compute_metrics(parsed, load_series)
            config_row = None
            if is_saved:
                # Build output_graph_points JSONB per HLD
                query = select(SolarProfileConfig).where(
                    SolarProfileConfig.simulation_id == simulation_id
                )
                result = await bess_db.execute(query)
                config_row = result.scalar_one_or_none()
                output_graph_points = {
                    "hourly": computed["hourly_generation_graph_points"],
                    "monthly": computed["monthly_generation_graph_points"],
                    "storable": computed["storable_solar_graph_points"],
                }

                before_filename = None
                if config_row:
                    # Get old filename
                    if config_row.source_type == "static":
                        before_filename = STATIC_SOLAR_PROFILES.get(
                            config_row.source_id
                        )
                    else:
                        old_src_res = await bess_db.execute(
                            select(SolarProfileSource.name).where(
                                SolarProfileSource.id == config_row.source_id
                            )
                        )
                        before_filename = old_src_res.scalar_one_or_none()

                    config_row.source_type = source_type
                    config_row.source_id = source_id
                    config_row.total_generation = float(computed["total_generation"])
                    config_row.peak_generation = float(computed["peak_generation"])
                    config_row.avg_generation = float(computed["avg_generation"])
                    config_row.generation_hours = int(computed["generation_hours"])
                    config_row.max_storable = float(computed["max_storable"])
                    config_row.excess_hours = int(computed["excess_hours"])
                    config_row.total_storable = float(computed["total_storable"])
                    config_row.max_available = float(computed["max_available"])
                    config_row.hours_at_max = float(computed["hours_at_max"])
                    config_row.output_graph_points = output_graph_points

                    await depreciate_simulation_job(
                        simulation_id=simulation_id, db=bess_db
                    )
                    await audit_logs(
                        db=bess_db,
                        user_id=f"USER-{current_user.get('id')}",
                        user_role=current_user.get("role"),
                        module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
                        action=AuditLogScenario.PROJECT_EDITED.value,
                        resource_id=resource_id,
                        before=json.dumps(
                            {
                                SimulationLogStep.SYSTEM_SETUP.value: {
                                    "Solar Profile CSV": before_filename
                                }
                            }
                        )
                        if before_filename
                        else None,
                        after=json.dumps(
                            {
                                SimulationLogStep.SYSTEM_SETUP.value: {
                                    "Solar Profile CSV": source_metadata["name"]
                                }
                            }
                        ),
                    )
                    await bess_db.commit()
                    await bess_db.refresh(config_row)
                else:
                    config_row = SolarProfileConfig(
                        simulation_id=simulation_id,
                        source_type=source_type,
                        source_id=source_id,
                        total_generation=float(computed["total_generation"]),
                        peak_generation=float(computed["peak_generation"]),
                        avg_generation=float(computed["avg_generation"]),
                        generation_hours=int(computed["generation_hours"]),
                        max_storable=float(computed["max_storable"]),
                        excess_hours=int(computed["excess_hours"]),
                        total_storable=float(computed["total_storable"]),
                        max_available=float(computed["max_available"]),
                        hours_at_max=float(computed["hours_at_max"]),
                        output_graph_points=output_graph_points,
                    )
                    bess_db.add(config_row)
                    # Update the simulation setup progress

                    await depreciate_simulation_job(
                        simulation_id=simulation_id, db=bess_db
                    )
                    await audit_logs(
                        db=bess_db,
                        user_id=f"USER-{current_user.get('id')}",
                        user_role=current_user.get("role"),
                        module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
                        action=AuditLogScenario.PROJECT_EDITED.value,
                        resource_id=resource_id,
                        before=None,
                        after=json.dumps(
                            {
                                SimulationLogStep.SYSTEM_SETUP.value: {
                                    "Solar Profile CSV": source_metadata["name"]
                                }
                            }
                        ),
                    )
                    await bess_db.commit()
                    await bess_db.refresh(config_row)

            await progress_simulation_setup(
                simulation_id=simulation_id,
                to=SimulationSetupProgress.SOLAR_PROFILE,
                db=bess_db,
            )
            # For static mode, use source_id as the id; for file mode, use config_row.id or source.id
            response_id = config_row.id if config_row else source_id

            data = {
                "id": response_id,
                "source": {
                    "type": source_type,
                    "id": source_id,
                    "metadata": source_metadata,
                },
                **computed,
            }
            return Res.success("S-20006", data=data, http_status_code=200)

        except Exception:
            tb = traceback.format_exc()
            traceback.print_exc()
            return Res.error(
                status_code="E-20001",
                message="Unable to compute solar profile",
                debug=tb,
                http_status_code=500,
            )

    async def compute_and_save_solar_profile(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        payload: SolarProfileComputeRequest,
        current_user: dict,
        resource_id: str,
    ):
        return await self.compute_solar_profile(
            bess_db=bess_db,
            simulation_id=simulation_id,
            payload=payload,
            current_user=current_user,
            resource_id=resource_id,
            is_saved=True,
        )

    async def get_solar_profile(self, bess_db: AsyncSession, simulation_id: int):
        result = await bess_db.execute(
            select(SolarProfileConfig).where(
                SolarProfileConfig.simulation_id == simulation_id
            )
        )
        config = result.scalar_one_or_none()

        if not config:
            return Res.error(status_code="E-20006", message="No simulation found")

        source_metadata: dict[str, Any] | None = None

        if config.source_type == "static":
            try:
                file_bytes, filename = self._read_static_csv_bytes(
                    int(config.source_id)
                )
                try:
                    parsed = self._parse_csv_bytes(file_bytes)
                except ValueError as ve:
                    return self._parse_csv_value_error_response(ve)

                source_metadata = {
                    "name": filename,
                    "size": len(file_bytes),
                    "rows": len(parsed.timestamps),
                    "year": parsed.year,
                }
            except FileNotFoundError:
                return Res.error(
                    status_code="E-20023",
                    message="Static solar profile source not found",
                    http_status_code=404,
                )
        else:
            # file mode
            src_result = await bess_db.execute(
                select(SolarProfileSource).where(
                    SolarProfileSource.id == config.source_id
                )
            )
            source = src_result.scalar_one_or_none()
            if not source:
                return Res.error(
                    status_code="E-20019",
                    message="Uploaded solar profile source not found",
                    http_status_code=404,
                )
            source_metadata = {
                "name": source.name,
                "size": source.size,
                "rows": source.rows,
                "year": source.year,
            }

        data = {
            "id": config.id,
            "source": {
                "type": config.source_type,
                "id": config.source_id,
                "metadata": source_metadata,
            },
            "total_generation": config.total_generation,
            "peak_generation": config.peak_generation,
            "avg_generation": config.avg_generation,
            "generation_hours": config.generation_hours,
            "max_storable": config.max_storable,
            "max_available": config.max_available,
            "hours_at_max": config.hours_at_max,
            "excess_hours": config.excess_hours,
            "total_storable": config.total_storable,
            "hourly_generation_graph_points": (config.output_graph_points or {}).get(
                "hourly"
            ),
            "monthly_generation_graph_points": (config.output_graph_points or {}).get(
                "monthly"
            ),
            "storable_solar_graph_points": (config.output_graph_points or {}).get(
                "storable"
            ),
        }

        return Res.success(status_code="S-20006", data=data)

    async def get_solar_profile_files(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
    ):
        try:
            result = await bess_db.execute(
                select(SolarProfileSource).where(
                    SolarProfileSource.simulation_id == simulation_id
                )
            )
            files = result.scalars().all()
            if not files:
                return Res.error(
                    status_code="E-20005",
                    message="No files found",
                    http_status_code=404,
                )
            file_list = [
                {
                    "key": f.key,
                    "size": f.size,
                    "rows": f.rows,
                    "year": f.year,
                    "name": f.name,
                    "id": f.id,
                }
                for f in files
            ]

            return Res.success(status_code="S-20022", data={"files": file_list})

        except Exception:
            traceback.print_exc()
            return Res.error(
                status_code="E-20001",
                message="Unable to fetch files",
                http_status_code=500,
            )
