from fastapi import APIRouter
from controller.asset_controller import AssetController


class AssetRouter:

    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/assets"
        self.tags = ["Assets"]

        self.controller = AssetController()
        self.router.get("/")(self.controller.get_assets)
        self.router.put("/{asset_id}/organization")(self.controller.reassign_asset)
        self.router.get('/{asset_id}/users')(self.controller.assets_users)
        self.router.get('/users')(self.controller.multiple_assets_users)
        self.router.get("/{asset_id}")(self.controller.get_asset_details)
        self.router.patch("/{asset_id}")(self.controller.edit_asset)
        self.router.post("/")(self.controller.onboard_asset)
        self.router.patch("/{asset_id}/optimization-parameters")(self.controller.save_optimization_params)
        self.router.post("/{asset_id}/activate")(self.controller.activate_asset)
        self.router.post("/{asset_id}/submit")(self.controller.submit_asset_for_approval)

        # report files
        self.router.post("/{asset_id}/aggregator-report")(self.controller.upload_aggregator_report)
        self.router.post("/{asset_id}/scada-report")(self.controller.upload_scada_report)
        self.router.post("/{asset_id}/iar-report")(self.controller.upload_iar_report)
        

        # files
        self.router.get("/{asset_id}/files")(self.controller.get_file_history)
        self.router.get("/{asset_id}/files/{file_id}/export")(self.controller.download_file_history)
        self.router.delete("/{asset_id}/files/{file_id}")(self.controller.delete_asset_file)

    
        # generete system files
        self.router.post("/{asset_id}/merge-dataset")(self.controller.merge_and_process_dataset)        
        self.router.post("/{asset_id}/optimized-dataset")(self.controller.generate_optimized_dataset)
