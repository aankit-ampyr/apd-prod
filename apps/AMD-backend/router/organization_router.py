from controller import OrganizationController
from fastapi import APIRouter


class OrganizationRouter:

    def __init__(self):
        self.router = APIRouter()
        self.endpoint = '/organizations'   # IMPORTANT
        self.controller = OrganizationController()
        self.tags = ['Organizations']

        # get organization list
        self.router.get('/')(self.controller.get_organizations)

        # create organization
        self.router.post('/')(self.controller.create_organization)

        # update organization
        self.router.patch("/{org_id}")(self.controller.update_organization)

        # get users for an organization
        self.router.get("/{org_id}/users")(self.controller.get_organization_users)
        self.router.get("/users")(self.controller.get_multiple_organization_users)