# Infrastructure as Code (Terraform)

This folder contains the Terraform configuration to provision the cloud infrastructure required to host the Library Chatbot on AWS.

## What this does
1. **Security Group**: Creates a firewall rule allowing SSH (Port 22) and Web Traffic (Port 8000).
2. **EC2 Instance**: Provisions an AWS `t2.micro` server (Free Tier eligible) running Ubuntu 22.04.
3. **Bootstrap Script**: Automatically installs Docker and Docker Compose on the server as soon as it boots up, so it is instantly ready to run the chatbot container.

## How to use
*(Note: You must have the AWS CLI installed and configured with your credentials before running this)*

1. Initialize the directory:
   ```bash
   terraform init
   ```
2. See what changes Terraform will make:
   ```bash
   terraform plan
   ```
3. Provision the infrastructure:
   ```bash
   terraform apply
   ```
4. Terraform will output a `public_ip`. You can SSH into the server and clone the repository to run `docker compose up -d`.

5. When you are done testing, destroy the resources to avoid being billed:
   ```bash
   terraform destroy
   ```
