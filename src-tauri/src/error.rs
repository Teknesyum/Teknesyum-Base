use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ErrorCode {
    Network,
    RateLimit,
    Auth,
    NotFound,
    NoAsset,
    Checksum,
    Io,
    GitMissing,
    Cancelled,
    Unknown,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_path: Option<String>,
}

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            log_path: None,
        }
    }

    pub fn io(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Io, message)
    }

    pub fn unknown(message: impl Into<String>) -> Self {
        Self::new(ErrorCode::Unknown, message)
    }

    pub fn cancelled() -> Self {
        Self::new(ErrorCode::Cancelled, "İşlem iptal edildi.")
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        let msg = match e.kind() {
            std::io::ErrorKind::PermissionDenied => format!("Dosyaya yazma izni yok: {e}"),
            std::io::ErrorKind::NotFound => format!("Dosya ya da klasör bulunamadı: {e}"),
            _ => format!("Dosya işlemi başarısız: {e}"),
        };
        Self::io(msg)
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        let msg = if e.is_timeout() {
            "GitHub yanıt vermedi (zaman aşımı).".to_string()
        } else if e.is_connect() {
            "GitHub'a bağlanılamadı. İnternet bağlantısını denetleyin.".to_string()
        } else {
            format!("Ağ hatası: {e}")
        };
        Self::new(ErrorCode::Network, msg)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        Self::unknown(format!("Veri çözümlenemedi: {e}"))
    }
}

impl From<zip::result::ZipError> for AppError {
    fn from(e: zip::result::ZipError) -> Self {
        Self::io(format!("Zip arşivi açılamadı: {e}"))
    }
}

impl From<keyring::Error> for AppError {
    fn from(e: keyring::Error) -> Self {
        Self::new(ErrorCode::Auth, format!("Kimlik Yöneticisi hatası: {e}"))
    }
}

pub type AppResult<T> = Result<T, AppError>;
