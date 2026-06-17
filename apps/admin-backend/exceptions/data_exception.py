class UserNotFound(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class UserDeleted(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class EmailAlreadyExists(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class PhoneAlreadyExists(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class HospitalNameAlreadyExists(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)