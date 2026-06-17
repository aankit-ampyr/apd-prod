from controller import UserController
from fastapi import APIRouter
class UserRouter:
    def __init__(self):
        self.router = APIRouter()
        self.endpoint = '/users'
        self.controller = UserController()
        self.tags = ['Users']
    
        # get users list
        self.router.get('/')(self.controller.get_users)

        # Assign Organization
        self.router.put("/{user_id}/organization")(self.controller.assign_organization)

