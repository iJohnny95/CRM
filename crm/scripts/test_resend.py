import resend
import os

# Set the API Key provided by the user
resend.api_key = "re_hJwFzT32_AYW8ia9UFQUhM2FuEvge8Cxy"

# Define parameters
params = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>"
}

try:
    print("Sending email...")
    email = resend.Emails.send(params)
    print("Success!")
    print(email)
except Exception as e:
    print("Error sending email:")
    print(e)
