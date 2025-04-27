import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_via_gmail(subject: str, body: str, to_email: str):
    host     = os.environ['SMTP_HOST']
    port     = int(os.environ.get('SMTP_PORT', 587))
    user     = os.environ['SMTP_USER']
    password = os.environ['SMTP_PASSWORD']

    msg = MIMEMultipart()
    msg['From']    = user
    msg['To']      = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    with smtplib.SMTP(host, port) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(user, password)
        server.send_message(msg)