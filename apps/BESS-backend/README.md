# General Guidance

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
```

# Run Worker
```bash
uv run taskiq worker broker:broker --workers 1
```