from flask import Flask, request, jsonify
import hydrogen.hydrogen as hydrogen

app = Flask(__name__)

@app.route("/electronCloud")
def electron_cloud():
    
    n = int(request.args.get('n', 1))
    l = int(request.args.get('l', 0))
    m = int(request.args.get('m', 0))
    Z = int(request.args.get('Z', 1))
    
    try:
        sampleSize = int(request.args.get('sampleSize', 1000))
    except:
        sampleSize = 1000

    return hydrogen.electron_density(n, l, m, Z, sampleSize)