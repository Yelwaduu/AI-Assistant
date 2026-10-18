import json
import traceback
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.shortcuts import  render
from django.views.decorators.http import require_POST
from google import genai

client = genai.Client(api_key = settings.GEMINI_API_KEY)

def index(request):
    return render(request, "Practice.html")



@require_POST
def chat(request):
    try:
        prompt = json.loads(request.body).get("prompt", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return JsonResponse({"error": "Invalid request."}, status=400)

    if not prompt or len(prompt) > 2000:
        return JsonResponse({"error": "Prompt is empty or too long."}, status=400)

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
        return JsonResponse({"reply": response.text})
    except Exception as e:
        traceback.print_exc()
        print("GEMINI ERROR:", e)
        print("MODEL IN USE:", settings.GEMINI_MODEL)
        return JsonResponse({"error": "The assistant is unavailable right now."}, status=502)

def service_worker(request):
    path = settings.BASE_DIR / "design" / "sw.js"
    return HttpResponse(path.read_text(), content_type="application/javascript")

   