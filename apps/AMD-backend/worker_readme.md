user upload file for month (ex oct 2025) (asset id 6)

      |
      V

backend calls worker to generate analytics data for asset_id=6, month=10, year=2025

      |
      V

worker starts generating analytics data for asset_id=6, month=10, year=2025

      |
      V

worker prepare list of functions to calles for compute (all the function which name started with get_)

      |
      V
    
worker calls the depency function to load them once in memory 
    - load_merged_file(asset_id=6, month=10, year=2025, db)
    - load_asset_usable_capacity(asset_id=6, db=db)
    - load_tb_spread_benchmark(month=10, year=2025, db=db)

worker calls the compute function with resolved depency passed.

      |
      V

worker store the result in db.