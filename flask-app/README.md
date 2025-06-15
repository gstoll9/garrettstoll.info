# Flask Application

This is a basic Flask application that demonstrates how to set up a simple web server.

## Project Structure

```
flask-app
├── app
│   ├── __init__.py
│   └── routes.py
├── requirements.txt
└── README.md
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd flask-app
   ```

2. **Create a virtual environment:**
   ```
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. **Install the required packages:**
   ```
   pip install -r requirements.txt
   ```

## Usage

To run the application, execute the following command:

```
flask run
```

Make sure to set the `FLASK_APP` environment variable to `app` before running the command.

## Endpoints

- **GET /**: This endpoint returns a welcome message.

## License

This project is licensed under the MIT License.