# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install --upgrade pip
RUN pip install -r backend/requirements.txt
EXPOSE 8000
CMD ["uvicorn","backend.main:app","--host","0.0.0.0","--port","8000"]
