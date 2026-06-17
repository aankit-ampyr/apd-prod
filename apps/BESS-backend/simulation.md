# Ampyr PSP - Simulation Flow & Column Calculation Analysis

## Overview
The Ampyr PSP tool runs **8760-hour (annual) simulations** of battery energy storage systems (BESS) to determine optimal sizing. The application uses a **multi-step wizard architecture** where simulations are performed at **Step 3 (Sizing)**, with results analyzed at **Step 4 (Results)**.

---

## 1. SIMULATION WORKFLOW

### Entry Points
- **Step 3 (Sizing)**: Batch simulations across multiple BESS/DG configurations
- **Step 4 (Results)**: Single simulation visualization for a selected configuration

### Data Flow
```
Step 1 (Setup) → Step 2 (Rules) → Step 3 (Sizing) → Step 4 (Results)
    ↓                ↓                  ↓                   ↓
Config Data    Dispatch Rules    Run Simulations    Visualize Hourly
                                                     Dispatch
```

---

## 2. SIMULATION PARAMETERS

### Input Data Structures

#### **SimulationParams** (src/dispatch_engine.py)
```python
@dataclass
class SimulationParams:
    # Profiles (8760 hours each)
    load_profile: List[float]           # MW per hour
    solar_profile: List[float]          # MW per hour
    
    # BESS Configuration
    bess_capacity: float                # MWh
    bess_charge_power: float            # MW
    bess_discharge_power: float         # MW
    bess_efficiency: float              # %
    bess_min_soc: float                 # % of capacity
    bess_max_soc: float                 # % of capacity
    bess_initial_soc: float             # % of capacity
    bess_daily_cycle_limit: Optional[float]
    bess_enforce_cycle_limit: bool
    
    # DG Configuration
    dg_enabled: bool
    dg_capacity: float                  # MW
    dg_charges_bess: bool
    dg_load_priority: str               # 'bess_first' or 'dg_first'
    dg_takeover_mode: bool
    
    # Time Windows (hours 0-23)
    night_start_hour: int
    night_end_hour: int
    day_start_hour: int
    day_end_hour: int
    blackout_start_hour: int
    blackout_end_hour: int
    
    # DG SoC Thresholds
    dg_soc_on_threshold: float          # %
    dg_soc_off_threshold: float         # %
    emergency_soc_threshold: float      # %
    
    # Fuel Model
    dg_fuel_curve_enabled: bool
    dg_fuel_f0: float                   # L/hr per kW rated
    dg_fuel_f1: float                   # L/kWh output
    dg_fuel_flat_rate: float            # L/kWh
    
    # Cycle Charging
    cycle_charging_enabled: bool
    cycle_charging_min_load_pct: float  # %
    cycle_charging_off_soc: float       # %
```

---

## 3. HOW SIMULATIONS ARE RUN

### Step 3: Batch Configuration Simulation

**Function**: `run_sizing_simulation()` (pages/Step3_Sizing.py, lines 123-276)

#### Configuration Generation
```python
# User inputs configuration range
capacity_range = (cap_min, cap_max, 5 MWh step)  # e.g., 25-150 MWh
container_types = ['5mwh_2.5mw', '5mwh_1.25mw']  # Container specs
dg_range = (dg_min, dg_max, dg_step) if DG enabled

# Example: 25-150 MWh, 2 container types, 25-75 MW DG (5 MW step)
# Total configurations = 26 × 2 × 11 = 572 configs
```

#### Configuration Loop
```python
for bess_capacity_mwh in capacity_range:
    for container_type in container_types:
        spec = CONTAINER_SPECS[container_type]
        bess_power_mw = bess_capacity_mwh / spec['duration_hr']
        
        for dg_capacity_mw in dg_range:
            # Build params
            params = SimulationParams(
                load_profile=load_profile,
                solar_profile=solar_profile,
                bess_capacity=bess_capacity_mwh,
                bess_charge_power=bess_power_mw,
                bess_discharge_power=bess_power_mw,
                # ... + 30+ other parameters from setup/rules
            )
            
            # Run simulation
            hourly_results = run_simulation(params, template_id, 8760)
            metrics = calculate_metrics(hourly_results, params)
            
            # Store result row
            results_df.append({...metrics...})
```

### Step 4: Single Configuration Simulation

**Function**: `run_single_simulation()` (pages/Step4_Results.py, lines 212-220)

```python
def run_single_simulation(bess_mwh, container_type, dg_mw):
    spec = CONTAINER_SPECS[container_type]
    bess_power_mw = bess_mwh / spec['duration_hr']
    
    params = build_simulation_params(bess_mwh, bess_power_mw, dg_mw)
    template_id = get_template_id()
    
    hourly_results = run_simulation(params, template_id, 8760)
    metrics = calculate_metrics(hourly_results, params)
    
    return hourly_results, metrics
```

---

## 4. CORE SIMULATION ENGINE

### Main Loop
**Function**: `run_simulation()` (src/dispatch_engine.py, lines 1097-1180)

```python
def run_simulation(params: SimulationParams, template_id: int, 
                   num_hours: int = 8760) -> List[HourlyResult]:
    
    state = initialize_simulation(params)
    dispatch_func = DISPATCH_FUNCTIONS[template_id]
    results = []
    
    for t in range(8760):
        # Daily reset at hour 0
        if new_day:
            state.daily_discharge = 0
            state.daily_cycles = 0
            state.bess_disabled_today = False
        
        # Initialize hourly result
        hour = HourlyResult()
        hour.t = t + 1
        hour.day = day_of_year
        hour.hour_of_day = t % 24
        
        # Get profiles
        hour.load = params.load_profile[t % len(load_profile)]
        hour.solar = params.solar_profile[t % len(solar_profile)]
        
        remaining_load = hour.load
        
        # Solar direct to load (priority 1)
        hour.solar_to_load = min(hour.solar, remaining_load)
        remaining_load -= hour.solar_to_load
        excess_solar = hour.solar - hour.solar_to_load
        
        # Dispatch logic (template-specific)
        remaining_load, bess_discharged, charge_power_used = dispatch_func(
            params, state, hour, remaining_load, excess_solar
        )
        
        # Unserved load
        hour.unserved = remaining_load if remaining_load > TOLERANCE
        
        # Clamp SOC to valid range
        state.soc = clamp(state.soc, min_soc, max_soc)
        
        # Record results
        hour.soc = state.soc
        hour.soc_pct = (state.soc / bess_capacity) * 100
        results.append(hour)
        
        state.dg_was_running = hour.dg_running
    
    return results
```

### Dispatch Logic (7 Templates)

**Templates**: 0-6 (Template 0 shown)

```python
def dispatch_template_0(params, state, hour, remaining_load, excess_solar):
    """Template 0: Solar + BESS Only"""
    
    # Charge BESS with excess solar
    hour.solar_to_bess, charge_power_used = charge_bess(
        state, excess_solar, 0
    )
    hour.solar_curtailed = excess_solar - hour.solar_to_bess
    
    # Discharge BESS to serve remaining load
    hour.bess_to_load, bess_discharged = discharge_bess(
        state, params, remaining_load
    )
    remaining_load -= hour.bess_to_load
    
    return remaining_load, bess_discharged, charge_power_used
```

**Charge Function** (src/dispatch_engine.py, lines 308-330)
```python
def charge_bess(state, energy_available, charge_power_used):
    charge_room = state.max_soc_mwh - state.soc
    charge_power_available = state.charge_power_limit - charge_power_used
    
    max_charge = min(
        energy_available,
        charge_power_available,
        charge_room / state.charge_efficiency
    )
    
    energy_stored = max_charge * state.charge_efficiency
    state.soc += energy_stored
    
    return max_charge, charge_power_used + max_charge
```

**Discharge Function** (src/dispatch_engine.py, lines 333-363)
```python
def discharge_bess(state, params, energy_needed):
    discharge_available = state.soc - state.min_soc_mwh
    
    max_discharge = min(
        energy_needed,
        state.discharge_power_limit,
        discharge_available * state.discharge_efficiency
    )
    
    energy_withdrawn = max_discharge / state.discharge_efficiency
    state.soc -= energy_withdrawn
    
    state.daily_discharge += max_discharge
    state.daily_cycles = state.daily_discharge / state.usable_capacity
    
    return max_discharge, True
```

---

## 5. HOURLY RESULT STRUCTURE

### HourlyResult Data Class
**File**: src/dispatch_engine.py, lines 105-152

```python
@dataclass
class HourlyResult:
    t: int                          # Hour number (1-8760)
    day: int                        # Day of year (1-365)
    hour_of_day: int                # Hour of day (0-23)
    
    load: float                     # Load (MW)
    solar: float                    # Solar generation (MW)
    
    # Solar dispatch
    solar_to_load: float            # Solar → Load directly
    solar_to_bess: float            # Solar → BESS
    solar_curtailed: float          # Solar wasted
    
    # BESS dispatch
    bess_to_load: float             # BESS → Load
    
    # DG dispatch
    dg_to_load: float               # DG → Load
    dg_to_bess: float               # DG → BESS
    dg_curtailed: float             # DG wasted
    dg_running: bool                # DG on/off
    dg_mode: str                    # 'OFF', 'NORMAL', 'EMERGENCY', 'TAKEOVER'
    dg_output_mw: float             # Actual DG output
    dg_fuel_consumed: float         # Fuel this hour (L)
    cycle_charging: bool            # DG in cycle charging mode
    
    # BESS state
    bess_assisted: bool             # BESS helping DG
    bess_state: str                 # 'Idle', 'Charging', 'Discharging'
    bess_power: float               # Power +/- (MW)
    
    # Energy metrics
    unserved: float                 # Unmet load (MW)
    soc: float                      # State of charge (MWh)
    soc_pct: float                  # State of charge (%)
    daily_cycles: float             # Daily cycle count
    bess_disabled: bool             # BESS disabled (cycle limit)
    
    # Time metadata
    is_night: bool
    is_day: bool
    is_blackout: bool
```

---

## 6. METRICS CALCULATION

### SummaryMetrics Data Class
**File**: src/dispatch_engine.py, lines 155-202

#### Aggregated Energy Metrics
```python
total_load = sum(r.load for r in results)                # MWh
total_solar_generation = sum(r.solar for r in results)   # MWh
total_solar_to_load = sum(r.solar_to_load for r in results)
total_solar_to_bess = sum(r.solar_to_bess for r in results)
total_solar_curtailed = sum(r.solar_curtailed for r in results)
total_bess_to_load = sum(r.bess_to_load for r in results)
total_dg_to_load = sum(r.dg_to_load for r in results)
total_dg_to_bess = sum(r.dg_to_bess for r in results)
total_unserved = sum(r.unserved for r in results)
```

#### Hour-Based Metrics
```python
hours_with_load = sum(1 for r in results if r.load > 0)

# Full delivery = Load hours with zero unserved
hours_full_delivery = sum(1 for r in results 
                          if r.load > 0 and r.unserved < TOLERANCE)

# Green delivery = Full delivery hours with DG off
hours_green_delivery = sum(1 for r in results 
                           if r.load > 0 and r.unserved < TOLERANCE 
                           and not r.dg_running)

hours_with_dg = sum(1 for r in results if r.dg_running)
```

#### Percentage Metrics
```python
# Against hours with load (handles seasonal patterns)
pct_full_delivery = (hours_full_delivery / hours_with_load) * 100
pct_green_delivery = (hours_green_delivery / hours_with_load) * 100
pct_unserved = (total_unserved / total_load) * 100
pct_solar_curtailed = (total_solar_curtailed / total_solar_generation) * 100
```

#### BESS Metrics
```python
bess_throughput = total_bess_to_load              # MWh
usable_capacity = capacity × (max_soc - min_soc) / 100
bess_equivalent_cycles = throughput / usable_capacity
```

#### DG Metrics
```python
dg_runtime_hours = sum(1 for r in results if r.dg_running)

dg_starts = count of transitions from OFF → ON
          = sum(1 for i, r in enumerate(results)
                if r.dg_running and not results[i-1].dg_running)

total_fuel_consumed = sum(r.dg_fuel_consumed for r in results)
avg_fuel_rate_lph = total_fuel / dg_runtime_hours
specific_fuel_consumption = total_fuel / total_dg_delivered
```

#### Seasonal Metrics
```python
# March 1 (day 60) to October 31 (day 304)
hours_full_delivery_mar_oct = count full delivery in season
hours_green_delivery_mar_oct = count green in season
pct_green_delivery_mar_oct = (green_hrs / full_hrs) * 100 in season
```

#### Green Energy Metrics
```python
total_green_energy_delivered = total_solar_to_load + total_bess_to_load
total_energy_delivered = solar_to_load + bess_to_load + dg_to_load
pct_green_energy = (green / total) * 100
```

---

## 7. RESULTS TABLE COLUMNS

### Step 3 Results DataFrame Columns
**File**: pages/Step3_Sizing.py, lines 234-257

```python
results_df.append({
    'BESS (MWh)': config['capacity_mwh'],           # Configuration
    'Duration (hr)': config['duration_hr'],         # Container duration
    'Power (MW)': config['power_mw'],               # Power capability
    'Containers': config['containers'],            # Container count
    'DG (MW)': config['dg_capacity_mw'],           # DG size
    
    'Delivery %': metrics.pct_full_delivery,        # Key metric: % hours fully served
    'Green %': metrics.pct_green_delivery,          # % hours served by green only
    'Wastage %': metrics.pct_solar_curtailed,       # % solar wasted
    
    'Delivery Hrs': metrics.hours_full_delivery,    # Hour count fully served
    'Load Hrs': metrics.hours_with_load,            # Hours with load demand
    'Green Hrs': metrics.hours_green_delivery,      # Hours served by green
    'DG Hrs': metrics.dg_runtime_hours,            # Hours DG running
    'DG Starts': metrics.dg_starts,                 # DG start count
    
    'BESS Cycles': metrics.bess_equivalent_cycles,  # Total cycles per year
    'Unserved (MWh)': metrics.total_unserved,       # Unmet energy
    'Fuel (L)': metrics.total_fuel_consumed,        # DG fuel consumption
})
```

### Step 4 Hourly Results DataFrame
**Function**: `hourly_results_to_dataframe()` (pages/Step4_Results.py, lines 230-262)

```python
data.append({
    'timestamp': datetime,                  # Date/time
    'hour': hr.t,                          # Hour number (1-8760)
    'day': hr.day,                         # Day of year
    'hour_of_day': hr.hour_of_day,         # Hour in day (0-23)
    
    'load_mw': hr.load,                    # Demand (MW)
    'solar_mw': hr.solar,                  # Generation (MW)
    'solar_to_load': hr.solar_to_load,     # Direct supply
    'solar_to_bess': hr.solar_to_bess,     # Charging
    'solar_curtailed': hr.solar_curtailed, # Wasted
    
    'bess_to_load': hr.bess_to_load,       # Discharge
    'bess_mw': hr.bess_power,              # Power +/-
    'bess_state': hr.bess_state,           # State text
    
    'dg_output_mw': hr.dg_to_load + hr.dg_to_bess + hr.dg_curtailed,
    'dg_state': 'ON' if hr.dg_running else 'OFF',
    'dg_to_load': hr.dg_to_load,
    'dg_to_bess': hr.dg_to_bess,
    'dg_curtailed': hr.dg_curtailed,
    
    'soc_mwh': hr.soc,                     # Energy stored (MWh)
    'soc_percent': hr.soc_pct,             # Percentage
    'unmet_mw': hr.unserved,               # Shortfall
    'delivery': 'Yes' if r.unserved < 0.001 else 'No',
    'daily_cycles': hr.daily_cycles,       # Cycle count for day
})
```

---

## 8. FILTER & SORT OPERATIONS

### Step 3 Results Filtering
```python
# Filter 100% delivery rows
if filter_100_delivery:
    filtered_df = filtered_df[filtered_df['Delivery %'] >= 99.9]

# Filter DG-free rows
if filter_zero_dg:
    filtered_df = filtered_df[filtered_df['DG Hrs'] == 0]

# Sort options
sort_by in ['Delivery %', 'BESS (MWh)', 'Wastage %', 'Green %', 'DG Hrs']
```

### Step 4 Hourly Visualization
- **Dispatch Graph** (4 traces on primary Y, 2 on secondary Y):
  - Solar (orange area)
  - DG Output (red area)
  - BESS Power (blue line)
  - Delivery (purple line)
  - SOC % (green dotted, secondary)
  - BESS Energy MWh (blue dashed, secondary)

---

## 9. PERFORMANCE OPTIMIZATION

### Caching Strategy
```python
# In Step 3: Results stored in session_state
st.session_state.sizing_results = results_df

# In Step 4: Check cache before re-running
cached_result = find_cached_result(bess_mwh, dg_mw, container_type)
if cached_result:
    return cached_result  # Use cached metrics
```

### Batch Configuration Generation
- **Configurations**: 26 × 2 × 11 = 572 configs (example)
- **Estimated time**: ~0.05 seconds per config × 572 = ~29 seconds total
- **Parallelization**: Could batch configurations, but currently sequential

---

## 10. TEMPLATE SYSTEM

### Template-Specific Dispatch Logic
```
Template 0: Solar + BESS Only
  Priority: Solar → BESS → Unserved

Template 1: Green Priority (with DG takeover mode)
  Priority: Solar + BESS first, DG if insufficient
  Mode: Can switch to DG Takeover (solar→BESS, DG→load)

Template 2: DG Night Charge
  Night: DG SoC-triggered
  Day: Green only (emergency DG if SoC critical)

Template 3: DG Blackout Window
  Blackout hrs: BESS/Solar only
  Other hrs: DG available

Template 4: DG Emergency Only
  Always: SoC-triggered (30%-80% deadband)
  Uses BESS assist/recovery logic

Template 5: DG Day Charge
  Day: DG SoC-triggered
  Night: Green only (emergency DG if needed)

Template 6: DG Night SoC Trigger
  Night: SoC-triggered
  Day: Green only (emergency DG if SoC critical)
```

---

## 11. COLUMN CALCULATION FLOW DIAGRAM

```
INPUTS (Step 1-2)
├── Load Profile (8760 hrs)
├── Solar Profile (8760 hrs)
├── Setup Config (efficiency, SOC limits, etc.)
└── Dispatch Rules (template, thresholds, times)
        ↓
SIMULATION (Step 3)
├── For each hour (0-8759):
│   ├── Read: load, solar
│   ├── Solar to Load (priority 1)
│   ├── Excess Solar to BESS (charge)
│   ├── BESS to Load (discharge if needed)
│   ├── DG logic (template-specific)
│   ├── Calculate: unserved, SOC, cycles, fuel
│   └── Store: HourlyResult
│
├── Aggregate HourlyResults
│   ├── Sum: energy flows (MWh)
│   ├── Count: delivery hours, DG hours, etc.
│   ├── Calculate: percentages, cycles, fuel rates
│   └── Seasonal: Mar-Oct metrics
│
└── Generate SummaryMetrics
    ├── Delivery %, Green %, Wastage %
    ├── DG Starts, BESS Cycles
    ├── Fuel consumption, SFC
    └── Energy-based green %

RESULTS (Step 3 DataFrame Row)
├── BESS (MWh)     ← Config
├── Duration (hr)  ← Config
├── Delivery %     ← metrics.pct_full_delivery
├── Green %        ← metrics.pct_green_delivery
├── Wastage %      ← metrics.pct_solar_curtailed
├── DG Hrs         ← metrics.dg_runtime_hours
├── DG Starts      ← metrics.dg_starts
├── BESS Cycles    ← metrics.bess_equivalent_cycles
├── Fuel (L)       ← metrics.total_fuel_consumed
└── Unserved (MWh) ← metrics.total_unserved

VISUALIZATION (Step 4)
├── Hourly DataFrame (8760 rows, 20+ columns)
├── Dispatch Graph (6 traces)
└── Metrics Summary Panel
```

---

## 12. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/dispatch_engine.py` | Core simulation engine (8 dataclasses, 7 templates, main loop) |
| `src/config.py` | Constants (efficiency defaults, tolerances) |
| `src/load_builder.py` | Load profile generation |
| `src/data_loader.py` | Solar profile loading |
| `pages/Step3_Sizing.py` | Batch simulations, results DataFrame |
| `pages/Step4_Results.py` | Single simulation, hourly visualization |
| `utils/metrics.py` | Metrics calculation utilities |
| `src/fuel_model.py` | DG fuel consumption calculations |

---

## Summary

**How They Run Simulations:**
1. Step 3 generates 50-1000+ configurations (BESS × duration × DG)
2. Each config runs `run_simulation()` for 8760 hours
3. `run_simulation()` loops hourly, applying dispatch logic (template-specific)
4. Each hour: Calculate solar→load→bess→dg flows, update SOC, track metrics
5. Aggregate results into SummaryMetrics
6. Store results as DataFrame row

**How Columns Are Calculated:**
- **Config columns**: Directly from configuration tuple (BESS MWh, Power, DG, etc.)
- **Energy columns**: Summed from hourly flows (MWh values)
- **Hour columns**: Counted from HourlyResult flags (delivery, DG on, etc.)
- **Percentage columns**: Derived ratios (delivery hours / load hours × 100)
- **Efficiency metrics**: BESS cycles = throughput / usable capacity
- **DG metrics**: Fuel, starts, runtime hours aggregated per simulation

