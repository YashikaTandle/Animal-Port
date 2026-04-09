import urllib.request
import re

url = 'https://www.kaggle.com/code/bobweng/dog-s-skin-diseases-image-dataset'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

with open("C:/Users/Sowmya Govindharajan/.gemini/antigravity/scratch/AnimalPort/kaggle.html", "w", encoding="utf-8") as f:
    f.write(html)

