<!-- # General Guidance

# Virual Environment Setup
```bash
# linux
python3 -m venv venv 
source venv/bin/activate
```
or 
```bash
# windows
python -m venv venv
.\venv\scripts\activate
```

# install the dependancies
```bash
# linux
pip3 install -r requirements.txt
```
or
```bash
# windows
pip install -r requirements.txt
```

# Database Migration
```bash
alembic revision --autogenerate

alembic upgrade head
```

# Run server
```bash
uvicorn main:app --port 8000 --host 0.0.0.0
``` -->

# General Guidance

# install UV
```bash
# linux
pip3 install uv
```

or 

```bash
# windows
pip install uv
```


# install the dependancies
```bash
uv sync
uv pip install -e ../../packages/python-common
```

# Database Migration
```bash
uv run alembic revision --autogenerate

uv run alembic upgrade head
```

# Run server
```bash
uv run uvicorn main:app --port 8000 --host 0.0.0.0
```