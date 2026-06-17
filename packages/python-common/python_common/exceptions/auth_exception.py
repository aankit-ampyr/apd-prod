class UserNotAuthorized(Exception):
      def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class UserSessionExpired(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)
    
class UserNotAuthenticated(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class UserTokenExpired(Exception):
    def __init__(self, message: str = "Token expired", status_code: str = "E-20002"):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class UserAccountBlocked(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)