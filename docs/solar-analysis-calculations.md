# Solar Analysis — Calculations, traced to source cells

Every number on the solar dashboard, with each operand traced back to the cells
it comes from. Cell references use `Tinte.xlsx` for **April 2026**; §1 gives the
general rule for locating the same ranges in any month's file.

Implementation: `asset_service.py::_build_solar_dataset` (derived operands),
`asset_analysis_service.py::get_solar_kpi_vitals` / `::get_solar_generation_split`.

---

## 1. Source sheets and ranges

Three of the eight sheets are used.

| Sheet | Header row | Data rows | Cadence | Columns used |
| --- | --- | --- | --- | --- |
| `Meter data` | 1 | 2 – 2881 | 15 min | `C` timestamp, `E` off-peak kWh, `F` peak kWh, `G` total kWh |
| `WMS` | **2** | 3 – 43198 | 1 min | `A` timestamp, `B` irradiance W/m² |
| `Active Power 1 min` | 1 | 2 – 43202 | 1 min | `A` timestamp, `B` fleet AC power kW |

`WMS` has its header on **row 2** — row 1 holds stray `=MAX(...)` formulas.

### Rows belonging to April 2026

Calculations use only rows whose timestamp falls inside the reporting month:

| Sheet | April rows | Count | Excluded |
| --- | --- | --- | --- |
| `Meter data` | **3 – 2881** | 2879 | row 2 = `2026-03-31 23:45` (previous month) |
| `WMS` | **3 – 43198** | 43196 | — |
| `Active Power 1 min` | **2 – 43201** | 43200 | row 43202 = `2026-05-01 00:00` (next month) |

Two quirks of this particular export, both harmless but worth knowing: the meter
stops at `30-Apr 23:30`, so the final interval of the month is absent (2879 rows
rather than 2880); and `WMS` is 4 samples short of a complete minute series.

### Row mapping between sheets

Let **k** = the 15-minute interval index within the month, `k = 0` for
`2026-04-01 00:00`. Then:

```
Meter data           row      = 3 + k
WMS                  rows     = 3 + 15k  .. 3 + 15k + 14      (15 one-minute samples)
Active Power 1 min   rows     = 2 + 15k  .. 2 + 15k + 14      (15 one-minute samples)
```

Worked check — interval `2026-04-15 12:00`, i.e. `k = 1392`:

| Sheet | Formula | Rows | Value |
| --- | --- | --- | --- |
| `Meter data` | `3 + 1392` | **1395** | `E=0.00`, `F=1350.79`, `G=1350.79` |
| `WMS` | `3 + 20880` | **20883 – 20897** | `AVERAGE` = 751.6033 W/m² |
| `Active Power 1 min` | `2 + 20880` | **20882 – 20896** | `MAX` = 6909.9183 kW |

---

## 2. Derived operands

Four operands are read straight from cells; two are computed from 1-minute data
before any metric uses them.

| Operand | Origin |
| --- | --- |
| `Export_kWh[k]` | `'Meter data'!G{3+k}` — direct |
| `Offpeak_kWh[k]` | `'Meter data'!E{3+k}` — direct |
| `Peak_kWh[k]` | `'Meter data'!F{3+k}` — direct |
| `Irradiance_Wm2[k]` | `AVERAGE(WMS!B{3+15k}:B{3+15k+14})` — **mean** of 15 cells |
| `AC_Power_kW[k]` | `MAX('Active Power 1 min'!B{2+15k}:B{2+15k+14})` — **max** of 15 cells |
| `capacity_mw` | `Asset.capacity` in the database — **not in the workbook**. Tinte = 9.8 |

Only intervals present in `Meter data` survive; weather and power rows outside
those intervals are discarded (the meter is the join spine).

---

## 3. The calculations

Each metric below gives the Excel-equivalent formula over April's ranges.

### Energy exported (MWh)

```
= SUM('Meter data'!G3:G2881) / 1000
= 1,343,336.21 / 1000
= 1343.34
```

### Peak power (MW)

```
= MAX('Active Power 1 min'!B2:B43201) / 1000
= 7,655.93 / 1000
= 7.66
```

Bucketing does not affect this: the maximum of the per-interval maxima equals the
maximum of the underlying 1-minute series.

### Insolation (kWh/m²)

Definition — sum each interval's mean irradiance multiplied by the interval
length (0.25 h):

```
= SUMPRODUCT(Irradiance_Wm2[k] × 0.25) / 1000        for all k in April
```

where each `Irradiance_Wm2[k] = AVERAGE(WMS!B{3+15k}:B{3+15k+14})`.

Because every April interval carries its full 15 samples, this reduces to a
single range formula:

```
= SUM(WMS!B3:B43198) / 60 / 1000
= 160.55
```

(`/60` because 15 samples × 0.25 h ÷ 15 = 1/60 h each.) Both forms were computed
and agree to 4 decimal places — 160.5490. The reduced form is only valid while
each interval is complete; the definition above is what the code implements.

### Specific yield (kWh/kW)

```
= SUM('Meter data'!G3:G2881) / (capacity_mw × 1000)
= 1,343,336.21 / 9,800
= 137.08
```

### Capacity factor (%)

```
= [SUM('Meter data'!G3:G2881) / 1000] / (capacity_mw × days_in_month × 24) × 100
= 1343.34 / (9.8 × 30 × 24) × 100
= 1343.34 / 7056 × 100
= 19.04
```

### Performance ratio (%)

```
= ROUND(specific_yield, 2) / insolation × 100
= 137.08 / 160.55 × 100
= 85.38
```

Note the input is the **rounded** specific yield, not the full-precision value —
the code rounds it where it is computed, and PR consumes that. Reproduce this
ordering or PR differs in the second decimal.

### Off-peak / Peak generation (MWh)

```
off_peak = SUM('Meter data'!E3:E2881) / 1000 = 380,927.37 / 1000 = 380.93
peak     = SUM('Meter data'!F3:F2881) / 1000 = 962,408.84 / 1000 = 962.41
```

These are the meter's two tariff registers (`laag` / `hoog`) — the grid
operator's tariff windows, not a time-of-day rule applied by us.

Reconciliation: `380.93 + 962.41 = 1343.34` = energy exported. ✔

---

## 4. Summary

| Dashboard number | April 2026 | Cells |
| --- | --- | --- |
| Energy exported | 1343.34 MWh | `'Meter data'!G3:G2881` |
| Peak power | 7.66 MW | `'Active Power 1 min'!B2:B43201` |
| Insolation | 160.55 kWh/m² | `WMS!B3:B43198` |
| Specific yield | 137.08 kWh/kW | `'Meter data'!G3:G2881` ÷ DB capacity |
| Capacity factor | 19.04 % | `'Meter data'!G3:G2881` ÷ DB capacity ÷ hours |
| Performance ratio | 85.38 % | specific yield ÷ insolation |
| Off-peak | 380.93 MWh | `'Meter data'!E3:E2881` |
| Peak | 962.41 MWh | `'Meter data'!F3:F2881` |

Unused by these metrics: `Meter data!H` (`Meterstand`, the cumulative register),
`WMS!C` (module temperature), and the `Setpoint`, `Active Power 15 min`,
`String DC Current`, `AC & DC Active Power` and `Daily AC Power` sheets.

---

## 5. Caveat — PR and specific yield are AC-referenced

`Asset.capacity` holds one figure, populated with the **AC** rating (9.8 MW).
Standard performance ratio and specific yield divide by **DC** capacity
(12.572 MWp per the EPC):

| Metric | As calculated (÷ 9.8 AC) | DC-referenced (÷ 12.572) |
| --- | --- | --- |
| Specific yield | 137.08 kWh/kW | 106.9 kWh/kWp |
| Performance ratio | 85.38 % | ≈ 66.6 % |

The AC-referenced PR reads high and is not comparable to a PVsyst PR or an EPC
performance guarantee. Correcting it requires a DC capacity (MWp) field on the
asset. Capacity factor is unaffected — it is conventionally AC-referenced.
