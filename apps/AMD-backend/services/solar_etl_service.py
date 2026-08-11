import re
from io import BytesIO

import pandas as pd


class SolarETLService:
    """Parses a plant SCADA export into a normalized 15-minute solar dataset.

    Source sheets and the derivation of every formula below are documented
    cell-by-cell in docs/solar-analysis-calculations.md. This service has no
    DB/HTTP concerns — bytes in, a normalized DataFrame (or validation
    errors) out — so it can be exercised directly against real plant exports
    without any app/service wiring.
    """

    SOLAR_REQUIRED_SHEETS = ("Meter data", "WMS", "Active Power 1 min")

    # Columns the plant computes by hand inside the workbook (highlighted in
    # the source file). They are ignored so the dashboard is derived from raw
    # instrument readings only — one export's manual "AC Power" column was
    # found to be off by a factor of 60 (see solar-analysis-calculations.md
    # §2.1), while the raw per-inverter columns it should have summed were
    # correct.
    SOLAR_MANUAL_COLUMNS = ("poa", "avg", "ac power", "sum", "dc gen", "mod temp")

    SOLAR_COLUMN_ALIASES = {
        "timestamp": (
            "time",
            "timestamp",
            "date time",
            "datetime",
            "tijdstip van",
            "start time",
            "interval start",
        ),
        "export": (
            "verbruik totaal",
            "total export",
            "export kwh",
            "export_kwh",
            "grid export",
            "generation total",
            "energy exported",
            "total kwh",
        ),
        "offpeak": (
            "verbruik laag",
            "off peak",
            "offpeak",
            "off-peak",
            "laag",
            "low tariff",
        ),
        "peak": (
            "verbruik hoog",
            "peak",
            "hoog",
            "high tariff",
        ),
    }

    # ===================== Label / column matching =====================

    def _normalize_solar_label(self, value) -> str:
        return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()

    def _solar_label_matches(self, value, aliases) -> bool:
        normalized = self._normalize_solar_label(value)
        compact = normalized.replace(" ", "")
        for alias in aliases:
            alias_normalized = self._normalize_solar_label(alias)
            alias_compact = alias_normalized.replace(" ", "")
            if alias_normalized and alias_normalized in normalized:
                return True
            if alias_compact and alias_compact in compact:
                return True
        return False

    def _find_solar_column(self, df, aliases):
        for col in df.columns:
            if self._solar_label_matches(col, aliases):
                return col
        return None

    def _find_timestamp_col(self, df):
        return self._find_solar_column(df, self.SOLAR_COLUMN_ALIASES["timestamp"])

    def _find_irradiance_cols(self, df):
        """Raw irradiance sensor columns, averaged later into a single series."""
        cols = []
        for col in df.columns:
            name = self._normalize_solar_label(col)
            if any(manual == name for manual in self.SOLAR_MANUAL_COLUMNS) or "temp" in name:
                continue
            if "irradiance" in name or "radiation" in name:
                cols.append(col)
        if cols:
            return cols

        # Some site exports have broken irradiance headers (e.g. a header of
        # just "-1"). Fall back to numeric W/m2-like columns so an upload
        # does not fail solely because a sensor label is malformed.
        timestamp_col = self._find_timestamp_col(df)
        for col in df.columns:
            if col == timestamp_col:
                continue
            name = self._normalize_solar_label(col)
            if any(manual == name for manual in self.SOLAR_MANUAL_COLUMNS) or "temp" in name:
                continue
            values = pd.to_numeric(df[col], errors="coerce")
            if values.notna().sum() == 0:
                continue
            if values.max() > 150 and values.max() <= 1500 and values.min() >= -10:
                cols.append(col)
        return cols

    def _find_power_cols(self, df):
        """Raw AC power columns and the divisor that converts them to kW.

        Newer exports carry one column per inverter in W; older ones carry a
        single plant-level total already in kW.
        """
        inverters = [
            col
            for col in df.columns
            if "powerac" in self._normalize_solar_label(col).replace(" ", "")
        ]
        if inverters:
            return inverters, 1000

        plant = [
            col
            for col in df.columns
            if "fleet sum" in self._normalize_solar_label(col)
            or (
                "active power" in self._normalize_solar_label(col)
                and "setpoint" not in self._normalize_solar_label(col)
            )
        ]
        return plant, 1

    # ===================== Sheet resolution =====================

    def _score_solar_sheet(self, sheet_name: str, preview_text: str, canonical: str):
        name = self._normalize_solar_label(sheet_name)
        text = self._normalize_solar_label(f"{sheet_name} {preview_text}")
        compact_name = name.replace(" ", "")

        if canonical == "Meter data":
            score = 0
            if "meterdata" in compact_name or "meter" in name:
                score += 5
            if "verbruik" in text or "tijdstip" in text:
                score += 4
            return score

        if canonical == "WMS":
            score = 0
            if name == "wms" or "weather" in name or "meteo" in name:
                score += 5
            if "irradiance" in text or "radiation" in text:
                score += 4
            return score

        if canonical == "Active Power 1 min":
            score = 0
            if "activepower1min" in compact_name or (
                "active power" in name and "1 min" in name
            ):
                score += 6
            if "fleet sum" in text or "power ac" in text or "active power" in text:
                score += 3
            # Prefer the 1-minute source. Other power sheets are aggregates
            # used for different purposes and should not win when AP 1-min
            # exists.
            if any(marker in name for marker in ("15 min", "daily", "setpoint")):
                score -= 4
            if "dc active power" in name or "ac dc active power" in name:
                score -= 3
            return score

        return 0

    def resolve_solar_sheets(self, xl: pd.ExcelFile) -> dict:
        """Fuzzy-matches the workbook's actual sheet names to the three
        canonical sheets this parser needs, since real exports rename/reorder
        sheets across months."""
        resolved = {}
        candidates = []
        for sheet_name in xl.sheet_names:
            try:
                preview = pd.read_excel(xl, sheet_name=sheet_name, header=None, nrows=8)
                preview_text = " ".join(
                    str(v) for v in preview.to_numpy().flatten() if pd.notna(v)
                )
            except Exception:
                preview_text = sheet_name

            for canonical in self.SOLAR_REQUIRED_SHEETS:
                score = self._score_solar_sheet(sheet_name, preview_text, canonical)
                if score > 0:
                    candidates.append((score, canonical, sheet_name))

        for score, canonical, sheet_name in sorted(candidates, reverse=True):
            if canonical not in resolved:
                resolved[canonical] = sheet_name

        return resolved

    def read_solar_sheet(self, xl: pd.ExcelFile, sheet_name: str) -> pd.DataFrame:
        # Plant exports sometimes include summary/formula rows above the real
        # header (e.g. WMS row 1 holds stray MAX() formulas). Scan the first
        # few rows and accept the first header that gives us a recognizable
        # timestamp column.
        for header_row in range(0, 10):
            df = pd.read_excel(xl, sheet_name=sheet_name, header=header_row)
            df.columns = [str(c).strip() for c in df.columns]
            if self._find_timestamp_col(df):
                return df

        df = pd.read_excel(xl, sheet_name=sheet_name)
        df.columns = [str(c).strip() for c in df.columns]
        return df

    # ===================== Validation =====================

    def validate_solar_excel(self, sheets: dict) -> list:
        errors = []

        for sheet_name in self.SOLAR_REQUIRED_SHEETS:
            if sheet_name not in sheets:
                errors.append(
                    {
                        "column": sheet_name,
                        "row": None,
                        "message": f"Required sheet '{sheet_name}' is missing.",
                    }
                )
                continue

            if not self._find_timestamp_col(sheets[sheet_name]):
                errors.append(
                    {
                        "column": "Timestamp",
                        "row": None,
                        "message": f"No timestamp column found in sheet '{sheet_name}'.",
                    }
                )

        if "Meter data" in sheets:
            meter = sheets["Meter data"]
            for key, label in (
                ("export", "total export"),
                ("offpeak", "off-peak export"),
                ("peak", "peak export"),
            ):
                if not self._find_solar_column(meter, self.SOLAR_COLUMN_ALIASES[key]):
                    errors.append(
                        {
                            "column": label,
                            "row": None,
                            "message": f"No {label} column found in sheet 'Meter data'.",
                        }
                    )

        # Sensor column names carry a plant-specific prefix and vary between
        # exports, so match them by keyword rather than an exact name.
        if "WMS" in sheets and not self._find_irradiance_cols(sheets["WMS"]):
            errors.append(
                {
                    "column": "Irradiance",
                    "row": None,
                    "message": "No irradiance sensor column found in sheet 'WMS'.",
                }
            )
        if (
            "Active Power 1 min" in sheets
            and not self._find_power_cols(sheets["Active Power 1 min"])[0]
        ):
            errors.append(
                {
                    "column": "Active Power",
                    "row": None,
                    "message": "No AC power column found in sheet 'Active Power 1 min'.",
                }
            )

        return errors

    def validate_solar_dataset(self, dataset: pd.DataFrame) -> list:
        errors = []

        if dataset.empty:
            errors.append(
                {
                    "column": "Solar data",
                    "row": None,
                    "message": "No valid solar data rows found.",
                }
            )
            return errors

        duplicated_timestamps = dataset["Timestamp"].duplicated().sum()
        if duplicated_timestamps:
            errors.append(
                {
                    "column": "Timestamp",
                    "row": None,
                    "message": f"{duplicated_timestamps} duplicate timestamp rows found after 15-minute normalization.",
                }
            )

        for col in ("Export_kWh", "Offpeak_kWh", "Peak_kWh"):
            numeric = pd.to_numeric(dataset[col], errors="coerce")
            if numeric.notna().sum() == 0:
                errors.append(
                    {
                        "column": col,
                        "row": None,
                        "message": f"No numeric values found for {col}.",
                    }
                )
            negative_count = int((numeric.fillna(0) < 0).sum())
            if negative_count:
                errors.append(
                    {
                        "column": col,
                        "row": None,
                        "message": f"{negative_count} negative values found in {col}.",
                    }
                )

        if pd.to_numeric(dataset["Irradiance_Wm2"], errors="coerce").fillna(0).max() <= 0:
            errors.append(
                {
                    "column": "Irradiance_Wm2",
                    "row": None,
                    "message": "No usable irradiance values found.",
                }
            )

        if pd.to_numeric(dataset["AC_Power_kW"], errors="coerce").fillna(0).max() <= 0:
            errors.append(
                {
                    "column": "AC_Power_kW",
                    "row": None,
                    "message": "No usable AC power values found.",
                }
            )

        return errors

    # ===================== Dataset construction =====================

    def build_solar_dataset(self, sheets: dict) -> pd.DataFrame:
        """Builds the normalized 15-minute dataset the rest of the Solar
        module reads from (columns: Timestamp, Export_kWh, Offpeak_kWh,
        Peak_kWh, Irradiance_Wm2, AC_Power_kW). Formulas per
        solar-analysis-calculations.md §2-3."""

        # Meter data is the 15-min spine (grid export + peak/off-peak split).
        meter = sheets["Meter data"].copy()
        meter_ts_col = self._find_timestamp_col(meter)
        meter_export_col = self._find_solar_column(meter, self.SOLAR_COLUMN_ALIASES["export"])
        meter_offpeak_col = self._find_solar_column(meter, self.SOLAR_COLUMN_ALIASES["offpeak"])
        meter_peak_col = self._find_solar_column(meter, self.SOLAR_COLUMN_ALIASES["peak"])
        spine = pd.DataFrame(
            {
                "Timestamp": pd.to_datetime(meter[meter_ts_col], errors="coerce"),
                "Export_kWh": pd.to_numeric(meter[meter_export_col], errors="coerce"),
                "Offpeak_kWh": pd.to_numeric(meter[meter_offpeak_col], errors="coerce"),
                "Peak_kWh": pd.to_numeric(meter[meter_peak_col], errors="coerce"),
            }
        ).dropna(subset=["Timestamp"])
        spine["merge_key"] = spine["Timestamp"].dt.floor("15min")

        # WMS irradiance: average the raw sensors, then resample the 1-min
        # series onto the 15-min grid as a mean.
        wms = sheets["WMS"].copy()
        wms_ts_col = self._find_timestamp_col(wms)
        irr_cols = self._find_irradiance_cols(wms)
        wms["merge_key"] = pd.to_datetime(wms[wms_ts_col], errors="coerce").dt.floor("15min")
        wms["Irradiance_Wm2"] = wms[irr_cols].apply(pd.to_numeric, errors="coerce").mean(axis=1)
        wms = wms.dropna(subset=["merge_key"])
        irr_grouped = wms.groupby("merge_key")["Irradiance_Wm2"].mean().reset_index()

        # Fleet AC power: total the raw power columns, then resample to
        # 15-min as a max so the peak is preserved.
        power = sheets["Active Power 1 min"].copy()
        power_ts_col = self._find_timestamp_col(power)
        power_cols, power_divisor = self._find_power_cols(power)
        power["merge_key"] = pd.to_datetime(power[power_ts_col], errors="coerce").dt.floor("15min")
        power["AC_Power_kW"] = (
            power[power_cols].apply(pd.to_numeric, errors="coerce").sum(axis=1) / power_divisor
        )
        power = power.dropna(subset=["merge_key"])
        power_grouped = power.groupby("merge_key")["AC_Power_kW"].max().reset_index()

        merged = spine.merge(irr_grouped, on="merge_key", how="left").merge(
            power_grouped, on="merge_key", how="left"
        )
        merged["Irradiance_Wm2"] = merged["Irradiance_Wm2"].fillna(0)
        merged["AC_Power_kW"] = merged["AC_Power_kW"].fillna(0)
        merged = merged.drop(columns=["merge_key"])

        return merged[
            ["Timestamp", "Export_kWh", "Offpeak_kWh", "Peak_kWh", "Irradiance_Wm2", "AC_Power_kW"]
        ]

    # ===================== Entry point =====================

    def parse(self, file_bytes: bytes) -> tuple[pd.DataFrame | None, list]:
        """Bytes in, normalized dataset out. Returns (dataset, []) on success
        or (None, errors) if the workbook fails structural or numeric
        validation."""
        xl = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
        resolved_sheets = self.resolve_solar_sheets(xl)
        sheets = {
            canonical_name: self.read_solar_sheet(xl, workbook_sheet_name)
            for canonical_name, workbook_sheet_name in resolved_sheets.items()
        }

        excel_errors = self.validate_solar_excel(sheets)
        if excel_errors:
            return None, excel_errors

        dataset = self.build_solar_dataset(sheets)

        dataset_errors = self.validate_solar_dataset(dataset)
        if dataset_errors:
            return None, dataset_errors

        return dataset, []
