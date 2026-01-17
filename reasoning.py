from huggingface_hub import InferenceClient
from dotenv import load_dotenv
import json, os

load_dotenv()

client = InferenceClient(
    api_key=os.environ["HF_TOKEN"],
)

def analyze_paragraph(paragraph: str) -> dict:
    prompt = f"""
Return your response as STRICT JSON with the following schema:

{{
  "summary": "2–3 sentence summary",
  "claims": ["claim 1", "claim 2", "..."],
  "assumptions": ["assumption 1", "assumption 2", "..."]
}}

Paragraph:
\"\"\"
{paragraph}
\"\"\"
"""

    completion = client.chat.completions.create(
        model="meta-llama/Llama-3.1-8B-Instruct",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.3
    )

    raw = completion.choices[0].message.content
    return json.loads(raw)


if __name__ == "__main__":
    paragraph_input = (
        "Public access to surveillance data is often justified as a deterrent, "
        "yet empirical evidence suggests such systems may displace rather than "
        "prevent harm, while simultaneously introducing new risks to privacy and misuse."
    )

    result = analyze_paragraph(paragraph_input)

    with open("reasoning_output.json", "w") as f:
        json.dump(result, f, indent=4)

    print("Analysis saved to reasoning_output.json")
