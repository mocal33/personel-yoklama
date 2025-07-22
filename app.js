// Adım 6'da belirleyeceğiniz kurumunuzun konum bilgileri
const INSTITUTION_LATITUDE = 36.612145; // Örnek: Ankara Kızılay Meydanı enlemi
const INSTITUTION_LONGITUDE = 34.304637; // Örnek: Ankara Kızılay Meydanı boylamı
const LOCATION_TOLERANCE_METERS = 100; // Kurumdan maksimum uzaklık (metre)

const statusElem = document.getElementById('status');
const checkInBtn = document.getElementById('checkInBtn');
const checkOutBtn = document.getElementById('checkOutBtn');
const messageElem = document.getElementById('message');
const googleSignInDiv = document.querySelector('.g_id_signin');

let userEmail = ''; // Kullanıcının Google e-posta adresi
let userLat = null; // Kullanıcının enlemi
let userLon = null; // Kullanıcının boylamı

// --- Google Tek Tıkla Oturum Açma Callback Fonksiyonu ---
window.handleCredentialResponse = (response) => {
    // Google'dan gelen kimlik belirteci (token)
    const idToken = response.credential;
    const decodedToken = parseJwt(idToken); // JWT token'ı çözümle
    
    userEmail = decodedToken.email;
    statusElem.textContent = `Hoş geldiniz, ${decodedToken.name || decodedToken.email}! Konum doğrulanıyor...`;
    
    // Google oturumu açıldıktan sonra konumu al
    getGeolocation();
};

// JWT token'ı çözümleme yardımcı fonksiyonu
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// --- Konum Bilgisi Alma ---
function getGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLat = position.coords.latitude;
                userLon = position.coords.longitude;
                statusElem.textContent = `Konum alındı. Kontrol ediliyor...`;
                checkLocationAndEnableButtons();
            },
            (error) => {
                statusElem.textContent = 'Konum alınamadı. Lütfen konum izni verdiğinizden emin olun.';
                console.error('Konum hatası:', error);
                messageElem.textContent = 'Yoklama yapmak için konum izni gereklidir.';
            },
            {
                enableHighAccuracy: true, // Daha yüksek doğruluk iste
                timeout: 10000,           // 10 saniye içinde yanıt bekle
                maximumAge: 0             // Önbellekten değil, yeni konum al
            }
        );
    } else {
        statusElem.textContent = 'Tarayıcınız konum servislerini desteklemiyor.';
        messageElem.textContent = 'Yoklama yapmak için konum servisleri destekleyen bir cihaz kullanın.';
    }
}

// --- Konum Doğrulama ve Butonları Etkinleştirme ---
function checkLocationAndEnableButtons() {
    if (userLat === null || userLon === null) {
        statusElem.textContent = 'Konum bilgisi eksik.';
        return;
    }

    const distance = getDistance(userLat, userLon, INSTITUTION_LATITUDE, INSTITUTION_LONGITUDE);

    if (distance <= LOCATION_TOLERANCE_METERS) {
        statusElem.textContent = `Konum doğrulandı. ${distance.toFixed(2)} metre uzaktasınız.`;
        checkInBtn.style.display = 'inline-block';
        checkOutBtn.style.display = 'inline-block';
        googleSignInDiv.style.display = 'none'; // Konum ve kimlik tamam ise Google düğmesini gizle
    } else {
        statusElem.textContent = `Konumunuz kurum dışında (${distance.toFixed(2)} metre).`;
        messageElem.textContent = 'Yoklama yapmak için kurum içinde olmalısınız.';
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'none';
    }
}

// Haversine formülü ile iki koordinat arasındaki mesafeyi hesaplama (metre cinsinden)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
}

// --- Yoklama Kaydını Gönderme ---
async function sendAttendanceRecord(action) {
    if (!userEmail) {
        messageElem.textContent = 'Lütfen önce Google hesabınızla oturum açın.';
        return;
    }
    if (userLat === null || userLon === null) {
        messageElem.textContent = 'Konum bilgisi alınamadı.';
        return;
    }

    messageElem.textContent = 'Yoklama kaydı gönderiliyor...';
    
    // Adım 3'te oluşturacağımız Google Apps Script Web Uygulaması URL'si
    const appsScriptUrl = 'YOUR_APPS_SCRIPT_WEB_APP_URL'; // https://script.google.com/macros/s/AKfycbzZMuB6QfPRVJZnTrDr0fXk5zaodAfQ96BsilqR29o_jK2yQmXhwPkgoVybvlppGAGB/exec

    try {
        const response = await fetch(appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors', // CORS hatasını önlemek için (Apps Script tarafında yapılandırma gerekecek)
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: userEmail,
                latitude: userLat,
                longitude: userLon,
                action: action,
                timestamp: new Date().toISOString()
            })
        });

        // no-cors modunda gerçek yanıtı okuyamayız, ancak isteğin gönderildiğinden eminiz
        // Apps Script tarafı 200 OK döndürecektir.
        messageElem.textContent = `${action} kaydınız başarıyla alındı! Teşekkür ederiz.`;
        setTimeout(() => {
            messageElem.textContent = ''; // Mesajı bir süre sonra temizle
        }, 5000); // 5 saniye sonra temizle

    } catch (error) {
        console.error('Yoklama kaydı gönderme hatası:', error);
        messageElem.textContent = `Yoklama kaydı gönderilirken bir hata oluştu: ${error.message}`;
    }
}

// --- Olay Dinleyicileri ---
checkInBtn.addEventListener('click', () => sendAttendanceRecord('Giris'));
checkOutBtn.addEventListener('click', () => sendAttendanceRecord('Cikis'));

// Sayfa yüklendiğinde Google oturum açma arayüzünü başlat
// ve sonrasında konum bilgisini almaya çalış.
// Google Tek Tıkla Oturum Açma, sayfa yüklendiğinde otomatik olarak kendi div'ini render eder.
// Bizim app.js'imiz, handleCredentialResponse ile tetiklenecek.
document.addEventListener('DOMContentLoaded', () => {
    // Kullanıcıya ilk mesajı göster
    statusElem.textContent = 'Lütfen konum izni verin ve Google ile oturum açın.';
    // Google oturum açma div'ini göster (kullanıcı etkileşimi için)
    googleSignInDiv.style.display = 'block';
});

// Konum alma işlemini, Google oturumu açıldıktan sonra handleCredentialResponse içinde çağırıyoruz.
// Eğer kullanıcı Google ile oturum açmadan konum istersek, bunu doğrudan DOMContentLoaded içinde çağırabilirdik.
// Ancak senaryomuzda önce Google kimliği sonra konum geliyor.
