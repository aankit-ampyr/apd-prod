from pprint import pprint

from models import MetricIndustryConfiguration, MonthlyHardcodedValue
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from utils.response_utils import Res
from datetime import datetime,timezone
from utils.log_utils import audit_logs
from constants.enums import APDAuditLogScenario as AuditLogScenario, APDAuditLogModules as AuditLogModules
from constants.defaults import ASSET_BENCHMARK_MONTHLY_HARDCODED_METRICS, ASSET_METRIC_LABEL
from typing import List
import httpx
import traceback
from dtos import BenchmarkUpdateRequest, MonthlyValueUpdateRequest
from config import MODO_ENERGY_BASE_URL, MODO_ENERGY_TOKEN
from constants.defaults import ASSET_BENCHMARK_METRICS

class MetricService:
    def __init__(self):
        pass

    async def get_benchmarks(self, db: AsyncSession):
        metrics = ASSET_BENCHMARK_METRICS
        query = (
            select(MetricIndustryConfiguration)
            .where(MetricIndustryConfiguration.metric_id.in_(metrics))
            .options(selectinload(MetricIndustryConfiguration.metric))
            .order_by(MetricIndustryConfiguration.metric_id.asc())
        )
    
        result = await db.execute(query)
        benchmarks = result.scalars().all()

        data = [
            {
                "id": b.id,
                "metric_id": b.metric_id,
                "metric_name": b.metric.metric_name,
                "industry_low": b.industry_low,
                "industry_mid": b.industry_mid,
                "industry_high": b.industry_high,
                "is_active": b.is_active,
            }
            for b in benchmarks
        ]

        return Res.success("S-10042", data=data)
    
    async def update_benchmarks(self, db: AsyncSession, payload: BenchmarkUpdateRequest, current_user: dict):
        updated_records = []

        # validate ids
        ids = [item.id for item in payload]
        if (set(ids) != set(ASSET_BENCHMARK_METRICS)):
            return Res.error("E-10001", message="un-supported metric is passed", http_status_code=400)

        for item in payload:
            result = await db.execute(
                select(MetricIndustryConfiguration)
                .options(selectinload(MetricIndustryConfiguration.metric))
                .where(MetricIndustryConfiguration.metric_id == item.id)
            )
            benchmark = result.scalars().first()

            industry_low = (item.industry_low if item.industry_low is not None else benchmark.industry_low) or 0
            industry_mid = (item.industry_mid if item.industry_mid is not None else benchmark.industry_mid) or 0
            industry_high = (item.industry_high if item.industry_high is not None else benchmark.industry_high) or 0

            if not benchmark:
                return Res.error("E-10208", message=f"Benchmark with id {item.id} not found")

            if (industry_low > industry_mid):
                return Res.error("E-10205", message="industry_low cannot be greater than industry_mid")

            if (industry_mid > industry_high):
                return Res.error("E-10206", message="industry_mid cannot be greater than industry_high")

            if (industry_low > industry_high):
                return Res.error("E-10207", message="industry_low cannot be greater than industry_high")

            # Store before/after state for audit
  
            before = {}
            after = {}

            # Update fields
            if item.industry_low is not None:
                before["Low"] = benchmark.industry_low
                after["Low"] = item.industry_low
                benchmark.industry_low = item.industry_low
            
            if item.industry_mid is not None:
                before["Mid"] = benchmark.industry_mid
                after["Mid"] = item.industry_mid
                benchmark.industry_mid = item.industry_mid
            
            if item.industry_high is not None:
                before["High"] = benchmark.industry_high
                after["High"] = item.industry_high
                benchmark.industry_high = item.industry_high
            

            benchmark.updated_at = datetime.now(timezone.utc)
            await db.flush()


            # Audit Logging
            await audit_logs(
                db=db,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.BENCHMARK_CONFIGURATION,
                action=AuditLogScenario.BENCHMARK_CONFIGURATION_UPDATED,
                before=before,
                after=after,
                resource_id=str(benchmark.metric_id),
            )

            updated_records.append({
            "id": benchmark.id,
            "metric_id": benchmark.metric_id,
            "metric_name": benchmark.metric.metric_name,
            "industry_low": benchmark.industry_low,
            "industry_mid": benchmark.industry_mid,
            "industry_high": benchmark.industry_high,
            "updated_at": benchmark.updated_at.isoformat() if benchmark.updated_at else None,
        })

        await db.commit()

        return Res.success("S-10043", data=updated_records, message="Benchmarks updated successfully")

    async def get_monthly_hardcoded_values(self, db: AsyncSession, month: List[int], year: List[int]):
        metric_display_map = ASSET_BENCHMARK_MONTHLY_HARDCODED_METRICS
        
        metrics_header = [
            {"id": m, "metric_name": ASSET_METRIC_LABEL.get(m)} 
            for m in metric_display_map
        ]

        stmt = select(MonthlyHardcodedValue).where(
            MonthlyHardcodedValue.metric_id.in_(metric_display_map)
        )
        if month:
            stmt = stmt.where(MonthlyHardcodedValue.month.in_(month))
        if year:
            stmt = stmt.where(MonthlyHardcodedValue.year.in_(year))

        stmt = stmt.order_by(
            MonthlyHardcodedValue.year.desc(), # year first, then month
            MonthlyHardcodedValue.month.desc()
        )

        result = await db.execute(stmt)
        db_records = result.scalars().all()

        latest_records = {}
        
        for v in db_records:
            key = (v.metric_id, v.month, v.year)
            if key not in latest_records:
                latest_records[key] = v

        monthly_values = [
            {
                "id": v.id,
                "metric_id": v.metric_id,
                "metric_name": ASSET_METRIC_LABEL.get(v.metric_id, "Unknown"),
                "month": v.month,
                "year": v.year,
                "value": int(v.value) if v.value else None
            }
            for v in latest_records.values()
        ]

        return Res.success("S-10045", data={
            "metrics": metrics_header,
            "monthly_values": monthly_values
        })

    async def save_monthly_hardcoded_values(self, db: AsyncSession, payload: MonthlyValueUpdateRequest, current_user: dict):
        metric_display_map = [x.value for x in ASSET_BENCHMARK_MONTHLY_HARDCODED_METRICS]
        validation_errors = []
        
        if validation_errors:
            return Res.error("E-10210", message="Monthly hardcoded values validation failed.", data={"errors": validation_errors})

        updated_records_data = []
        payload = list(filter(lambda x: x.metric_id in metric_display_map, payload))

        for item in payload:
            if hasattr(item, 'id'):
                stmt = select(MonthlyHardcodedValue).where(MonthlyHardcodedValue.id == item.id)
            else:
                stmt = select(MonthlyHardcodedValue).where(
                    MonthlyHardcodedValue.metric_id == item.metric_id,
                    MonthlyHardcodedValue.month == item.month,
                    MonthlyHardcodedValue.year == item.year
                )
            
            existing = (await db.execute(stmt)).scalar_one_or_none()
            
            if existing:
                existing.value = item.value
                target_record = existing
            else:
                target_record = MonthlyHardcodedValue(
                    metric_id=item.metric_id,
                    month=item.month,
                    year=item.year,
                    value=item.value
                )
                db.add(target_record)
            
            await db.flush() 

            updated_records_data.append({
                "id": target_record.id,
                "metric_name": ASSET_METRIC_LABEL.get(target_record.metric_id, "Unknown"),
                "metric_id": target_record.metric_id,
                "month": target_record.month,
                "year": target_record.year,
                "value": target_record.value
            })

        await db.commit()

        await audit_logs(
            db=db,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=AuditLogModules.MONTHLY_VALUE_MANAGEMENT_AMD,
            action=AuditLogScenario.MONTHLY_METRIC_UPDATED,
            before="Monthly metric values update",
            after=f"Updated {len(updated_records_data)} values.",
            resource_id=None
        )

        return Res.success("S-10044", data=updated_records_data)
    
    async def get_modo_energy_monthly_benchmark(self, month:int, year: int):
        # prepare data and header
        try:
            endpoint = '/pub/v1/gb/modo/benchmarking/monthly-index-live'
            
            param_string = f"{year}-{month:02d}"
            url = MODO_ENERGY_BASE_URL + endpoint

            params = {
                "month_from": param_string,
                "month_to": param_string
            }

            headers = {
                "X-Token" : MODO_ENERGY_TOKEN
            }   

            # make api call
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, headers=headers)
                data = response.json()
            

            # perform calculation for metric calculation
            entry = None

            # search for market = 'total', duration = '*'
            for metric in data:
                duration = metric['duration']
                market = metric['market']

                if (duration == '*' and market == 'total'):
                    entry = metric
            
            if not entry:
                return Res.error('E-10122', message='entry not found')
            
            # caulcate benchmark value
            revenue_permw = entry['revenue_permw']
            benchmark_value = revenue_permw * 12 # make it per year
            return Res.success(data={
                'modo_benchmark_per_mw_per_year' : benchmark_value
            })

        except Exception:
            traceback.print_exc()
            return Res.error('E-10122')


