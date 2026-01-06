# API Backend - Python with FAISS
FROM condaforge/miniforge3:latest

WORKDIR /app

COPY environment.yml /app/environment.yml
RUN conda env update -n base -f /app/environment.yml && conda clean -a -y

ENV PYTHONUNBUFFERED=1

COPY . /app

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
