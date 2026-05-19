# picgo-plugin-oci

A [PicGo](https://github.com/PicGo/PicGo-Core) uploader plugin for [Oracle Cloud Infrastructure (OCI) Object Storage](https://www.oracle.com/cloud/storage/object-storage/).

OCI Object Storage is S3-compatible, this plugin uses the AWS SDK for JavaScript (S3 client) to upload images.

## Install

### PicGo-CLI

```bash
picgo install oci
```

### PicGo GUI

If published to the marketplace, search for `oci` and install.

### Local Import

For unpublished development or self-hosted usage:

1. Clone or download this repo:
   ```bash
   git clone https://git.huaqingxu.dpdns.org/devops/picgo-oci-plugin.git
   ```
2. Install dependencies and build:
   ```bash
   cd picgo-oci-plugin
   npm install
   npm run build
   ```
3. In PicGo GUI, go to **插件设置** → **导入本地插件** and select the plugin root directory (`picgo-oci-plugin/`).

## Configuration

```bash
picgo set uploader oci
```

You'll be prompted for:

| Field             | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `accessKeyID`     | OCI Customer Secret Key ID (generated in OCI Console)                    |
| `secretAccessKey` | OCI Customer Secret Key (generated in OCI Console)                       |
| `namespace`       | OCI Object Storage namespace (Tenancy > Object Storage Settings)         |
| `region`          | OCI region (e.g. `us-ashburn-1`, `eu-frankfurt-1`, `ap-singapore-1`)    |
| `bucketName`      | OCI Object Storage bucket name                                           |
| `uploadPath`      | Upload path template (default: `{year}/{month}/{md5}.{extName}`)         |
| `endpoint`        | Custom endpoint (leave empty to auto-construct from namespace + region)  |
| `proxy`           | Proxy URL (optional)                                                     |
| `acl`             | Canned ACL (default: `public-read`)                                      |
| `outputURLPattern`| Custom output URL template (optional)                                    |

### How to get OCI credentials

1. Go to OCI Console > Identity > Users
2. Select your user > Resources > Customer Secret Keys
3. Click "Generate Secret Key" and save the **Access Key ID** and **Secret Key**

### How to find your Object Storage namespace

- Go to OCI Console > Tenancy > **Object Storage Settings**
- The **Namespace** field is your Object Storage namespace

## Upload Path Template

| Variable          | Description                        |
| ----------------- | ---------------------------------- |
| `{year}`          | Current year (e.g. 2026)           |
| `{month}`         | Current month (01-12)              |
| `{day}`           | Current day (01-31)                |
| `{fullName}`      | Original file name with extension  |
| `{fileName}`      | Original file name without ext     |
| `{extName}`       | File extension without dot         |
| `{md5}`           | MD5 hash of file content           |
| `{sha1}`          | SHA1 hash of file content          |
| `{sha256}`        | SHA256 hash of file content        |
| `{timestamp}`     | Unix timestamp (seconds)           |
| `{timestampMS}`   | Unix timestamp (milliseconds)      |

Example: `images/{year}/{month}/{md5}.{extName}`

## License

MIT
