# weather code challenge Project

This is monorepo holds api(BE) and ui(FE). project folders
structure:
- api (including all the BE and unit test code)

## API

**Install dependencies**
```bash
$ cd api
$ yarn
```
**Build lambda functions and generate zip files**
```bash
$ yarn package
```

**Run unit test**
```bash
$ yarn test
```

**Configure AWS**
In the root folder
```bash
$ aws configure
$ AWS Access Key ID [None]: YOUR_ACCESS_KEY_ID
$ AWS Secret Access Key [None]: YOUR_SECRET_ACCESS_KEY
$ Default region name [None]: ap-southeast-2
```

**Add weather API Key**
> Set up Weather API account and create API KEY. you need
add the api_key in terraform.tfvars file.
```bash
$ vi terraform.tfvars
$ api_key = "Weather_API_Key"
```

**Deploy code using terraform**
```bash
$ terraform init
$ terraform apply -auto-approve
```
> you will see the output in the sceen. like
api_url = "https://0ueye50sil.execute-api.ap-southeast-2.amazonaws.com/dev"
bucket_name = "weather-862355ea2324d860"
and you could use the api_url as base_url to test the api and you could check request/response json files in the bucket_name.

**Test API**
> Test get current weather by city(sydney) and get history weather by city(sydney). dt is the timestamp, Timestamp (Unix time, UTC time zone), e.g. dt=1586468027. Data is available from January 1st, 1979 till 4 days ahead
```bash
$ curl -X GET "https://0ueye50sil.execute-api.ap-southeast-2.amazonaws.com/dev/weather/sydney"
$ curl -X GET \
"https://0ueye50sil.execute-api.ap-southeast-2.amazonaws.com/dev/weather/history/sydney?dt=1643803200"
```

