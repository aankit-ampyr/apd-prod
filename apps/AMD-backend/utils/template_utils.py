from models.template_model import EmailTemplate
from python_common.utils.template_utils import TemplateUtils as BaseTemplateUtils

class TemplateUtils(BaseTemplateUtils):
    def __init__(self):
        super().__init__(EmailTemplate)

template_utils = TemplateUtils()

__all__ = ["template_utils"]