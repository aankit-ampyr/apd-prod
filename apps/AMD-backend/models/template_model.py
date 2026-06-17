from db.db_config import UserBase as Base
from python_common.models import EmailTemplateMixin
class EmailTemplate(EmailTemplateMixin, Base):
    __tablename__ = "templates"
