provider "aws" {
  profile = "default"
  region = "ap-southeast-2"
}

resource "random_id" "bucket_id" {
  byte_length = 8
}

resource "aws_s3_bucket" "weather" {
  bucket = "weather-${random_id.bucket_id.hex}"
  acl    = "private"

  tags = {
    Name        = "weather bucket"
    Environment = "dev"
  }
}

resource "aws_s3_bucket_versioning" "weather_versioning" {
  bucket = aws_s3_bucket.weather.bucket

  versioning_configuration {
    status = "Enabled"
  }
}


resource "aws_iam_role" "lambda_role" {
  name = "lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  inline_policy {
    name = "lambda-s3-bucket"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ],
        Resource = [
          "${aws_s3_bucket.weather.arn}/*"
        ]
      }
    ]
    })
  }
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "get_weather_by_city" {
  filename         = "lambda_get_weather_by_city.zip"
  function_name    = "get_weather_by_city"
  role             = aws_iam_role.lambda_role.arn
  handler          = "dist/get_weather_by_city.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("lambda_get_weather_by_city.zip")
  timeout          = 30

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.weather.bucket
      API_KEY = var.api_key
    }
  }
}

resource "aws_lambda_function" "get_history_weather_by_city" {
  filename         = "lambda_get_history_weather_by_city.zip"
  function_name    = "get_history_weather_by_city"
  role             = aws_iam_role.lambda_role.arn
  handler          = "dist/get_history_weather_by_city.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("lambda_get_history_weather_by_city.zip")
  timeout          = 30

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.weather.bucket
      API_KEY = var.api_key
    }
  }
}

resource "aws_cloudwatch_log_group" "get_weather_by_city" {
  name = "/aws/lambda/${aws_lambda_function.get_weather_by_city.function_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "get_history_weather_by_city" {
  name = "/aws/lambda/${aws_lambda_function.get_history_weather_by_city.function_name}"
  retention_in_days = 30
}

resource "aws_iam_role" "api_gateway_cloudwatch_role" {
  name = "APIGatewayCloudWatchLogsRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = {
        Service = "apigateway.amazonaws.com"
      },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "api_gateway_cloudwatch_policy" {
  name   = "APIGatewayCloudWatchLogsPolicy"
  role   = aws_iam_role.api_gateway_cloudwatch_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      Resource = "*"
    }]
  })
}

resource "aws_apigatewayv2_api" "weather_api" {
  name        = "WeatherAPI"
  protocol_type = "HTTP"
  description = "API for weather information"
}

resource "aws_api_gateway_account" "api_gateway_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_role.arn
}

resource "aws_cloudwatch_log_group" "api_gw_log_group" {
  name = "/aws/apigateway/weather-api"
}

resource "aws_apigatewayv2_stage" "weather_api_stage" {
  api_id = aws_apigatewayv2_api.weather_api.id
  name = "dev"
  auto_deploy = true
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw_log_group.arn
    format = jsonencode({
      requestId: "$context.requestId",
      ip: "$context.identity.sourceIp",
      requestTime: "$context.requestTime",
      protocol: "$context.protocol",
      httpMethod: "$context.httpMethod",
      resourcePath: "$context.resourcePath",
      routeKey: "$context.routeKey",
      status: "$context.status",
      responseLength: "$context.responseLength"
      integrationErrorMessage: "$context.integrationErrorMessage"
    })
  }
}

resource "aws_apigatewayv2_integration" "weather_integration_get_city" {
  api_id = aws_apigatewayv2_api.weather_api.id
  integration_uri = aws_lambda_function.get_weather_by_city.invoke_arn
  integration_type = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_integration" "history_weather_integration_get_city" {
  api_id = aws_apigatewayv2_api.weather_api.id
  integration_uri = aws_lambda_function.get_history_weather_by_city.invoke_arn
  integration_type = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "get_weather_by_city" {
  api_id = aws_apigatewayv2_api.weather_api.id
  route_key = "GET /weather/{city}"
  target = "integrations/${aws_apigatewayv2_integration.weather_integration_get_city.id}"
}

resource "aws_apigatewayv2_route" "get_history_weather_by_city" {
  api_id = aws_apigatewayv2_api.weather_api.id
  route_key = "GET /weather/history/{city}"
  target = "integrations/${aws_apigatewayv2_integration.history_weather_integration_get_city.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id = "AllowExecutionFromAPIGateway"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_weather_by_city.function_name
  principal = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_history" {
  statement_id = "AllowExecutionFromAPIGateway"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_history_weather_by_city.function_name
  principal = "apigateway.amazonaws.com"
  source_arn = "${aws_apigatewayv2_api.weather_api.execution_arn}/*/*"
}

output "api_url" {
  value = aws_apigatewayv2_stage.weather_api_stage.invoke_url
}

output "bucket_name" {
  value = aws_s3_bucket.weather.bucket
  description = "The name of the S3 bucket"
}
