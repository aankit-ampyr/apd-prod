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

        # create user
        self.router.post("/", status_code=201)(self.controller.create_user)

        # update user
        self.router.patch("/{user_id}")(self.controller.update_user)

        # delete user
        self.router.delete("/{user_id}")(self.controller.delete_user)

