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


class EmptyEmailField(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class InvalidEmail(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class PayloadValidation(ValueError):
    def __init__(self, status_code: str, message: str = ""):
        self.status_code = status_code
        self.message = message or status_code
        super().__init__(self.message)

class ProjectDeleted(Exception):
    def __init__(self, message: str = "Project not found"):
        self.message = message
        super().__init__(self.message)

class ExceptionWithErrorCode(Exception):
    def __init__(self, error_code: str, message: str=""):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class DependencyNotAvailableError(ExceptionWithErrorCode):
    def __init__(self, error_code: str, message: str=""):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message, self.error_code)