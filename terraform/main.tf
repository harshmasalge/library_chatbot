provider "aws" {
  region = var.aws_region
}

# 1. Security Group to allow inbound traffic on port 22 (SSH) and 8000 (App)
resource "aws_security_group" "chatbot_sg" {
  name        = "chatbot-sg"
  description = "Allow inbound traffic for Library Chatbot"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "FastAPI App"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 2. EC2 Instance (Free Tier)
resource "aws_instance" "chatbot_server" {
  ami           = "ami-0c55b159cbfafe1f0" # Ubuntu Server 22.04 LTS (us-east-2)
  instance_type = "t2.micro"              # Free tier eligible
  
  vpc_security_group_ids = [aws_security_group.chatbot_sg.id]

  # 3. Bootstrap script (User Data) to install Docker when the server boots
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io docker-compose
              systemctl start docker
              systemctl enable docker
              EOF

  tags = {
    Name = "LibraryChatbot-Server"
  }
}

# 4. Output the public IP address so we know where to connect
output "public_ip" {
  value       = aws_instance.chatbot_server.public_ip
  description = "The public IP address of the chatbot server"
}
