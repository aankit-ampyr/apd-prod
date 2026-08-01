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


# Run Worker
```bash
uv run taskiq worker broker:broker --workers 1
```

# Run server
```bash
uv run uvicorn main:app --port 8010 --host 0.0.0.0
```