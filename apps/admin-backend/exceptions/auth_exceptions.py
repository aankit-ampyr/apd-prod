class UserNotAuthorized(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class UserSessionExpired(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


# class UserNotAuthenticated(Exception):
#     def __init__(self, message: str):
#         self.message = message
#         super().__init__(self.message)

