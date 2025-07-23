// Adım 6'da belirleyeceğiniz kurumunuzun konum bilgileri
const INSTITUTION_LATITUDE = 36.612145; // Örnek: Ankara Kızılay Meydanı enlemi
const INSTITUTION_LONGITUDE = 34.304637; // Örnek: Ankara Kızılay Meydanı boylamı
const LOCATION_TOLERANCE_METERS = 50; // Kurumdan maksimum uzaklık (metre)

const statusElem = document.getElementById('status');
const checkInBtn = document.getElementById('checkInBtn');
const messageElem = document.getElementById('message');
const googleSignInDiv = document.querySelector('.g_id_signin');

let userEmail = ''; // Kullanıcının Google e-posta adresi
let userLat = null; // Kullanıcının enlemi
let userLon = null; // Kullanıcının boylamı

// --- Google Tek Tıkla Oturum Açma Callback Fonksiyonu ---
window.handleCredentialResponse = (response) => {
    // Google'dan gelen kimlik belirteci (token)
    const idToken = response.credential;
    const decodedToken = parseJwt(idToken); 
    
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
                messageElem.classList.add('error'); // Konum hatasında da kırmızı
            },
            {
                enableHighAccuracy: true, 
                timeout: 10000,           
                maximumAge: 0             
            }
        );
    } else {
        statusElem.textContent = 'Tarayıcınız konum servislerini desteklemiyor.';
        messageElem.textContent = 'Yoklama yapmak için konum servisleri destekleyen bir cihaz kullanın.';
        messageElem.classList.add('error'); // Tarayıcı desteği yoksa da kırmızı
    }
}

// --- Konum Doğrulama ve Butonları Etkinleştirme ---
function checkLocationAndEnableButtons() {
    messageElem.classList.remove('error'); // Her kontrolde hata sınıfını temizle
    if (userLat === null || userLon === null) {
        statusElem.textContent = 'Konum bilgisi eksik.';
        return;
    }

    const distance = getDistance(userLat, userLon, INSTITUTION_LATITUDE, INSTITUTION_LONGITUDE);

    if (distance <= LOCATION_TOLERANCE_METERS) {
        statusElem.textContent = `Konum doğrulandı. ${distance.toFixed(2)} metre uzaktasınız.`;
        checkInBtn.style.display = 'inline-block'; // Butonu görünür yap
        googleSignInDiv.style.display = 'none'; 
    } else {
        statusElem.textContent = `Konumunuz kurum dışında (${distance.toFixed(2)} metre).`;
        messageElem.textContent = 'Yoklama yapmak için kurum içinde olmalısınız.';
        messageElem.classList.add('error'); // Hata sınıfını ekledik, kırmızı olacak
        checkInBtn.style.display = 'none'; // Butonu gizle
    }
}

// Haversine formülü ile iki koordinat arasındaki mesafeyi hesaplama (metre cinsinden)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI / 180; 
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; 
    return d;
}

// --- Yoklama Kaydını Gönderme ---
async function sendAttendanceRecord(action) {
    messageElem.classList.remove('error'); // Her gönderimde hata sınıfını temizle
    if (!userEmail) {
        messageElem.textContent = 'Lütfen önce Google hesabınızla oturum açın.';
        messageElem.classList.add('error');
        return;
    }
    if (userLat === null || userLon === null) {
        messageElem.textContent = 'Konum bilgisi alınamadı.';
        messageElem.classList.add('error');
        return;
    }

    messageElem.textContent = 'Yoklama kaydı gönderiliyor...';
    messageElem.style.color = '#333'; // Gönderim sırasında rengi normal yap
    messageElem.style.fontWeight = 'normal';

    // Apps Script Web Uygulaması URL'si (en son güncel hali)
    const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbxnaob-DFPpSydpFjWZ64543RgraHM3D8mBjBXGIw1vRtZt8psVI0GlsXa7p4Vosyip/exec'; 

    try {
        const response = await fetch(appsScriptUrl, {
            method: 'POST',
            mode: 'no-cors', 
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

        messageElem.textContent = `${action} kaydınız başarıyla alındı! Teşekkür ederiz.`;
        messageElem.style.color = '#28a745'; // Başarı mesajının rengi
        messageElem.style.fontWeight = 'bold'; // Başarı mesajının kalınlığı
        checkInBtn.style.display = 'none'; // Başarılı kayıt sonrası butonu gizle

        setTimeout(() => {
            messageElem.textContent = 'Sayfayı kapatabilirsiniz.'; // 10 saniye sonra görünecek mesaj
            messageElem.style.color = '#0056b3'; // Mesaj rengini değiştirebiliriz
            messageElem.style.fontSize = '1.2em'; // İsterseniz puntosunu ayarlayabilirsiniz
            messageElem.style.fontWeight = 'normal'; // Kalınlığı kaldırabilirsiniz
        }, 10000); // 'Teşekkür ederiz' mesajı 10 saniye boyunca kalacak

    } catch (error) {
        console.error('Yoklama kaydı gönderme hatası:', error);
        messageElem.textContent = `Yoklama kaydı gönderilirken bir hata oluştu: ${error.message}`;
        messageElem.classList.add('error'); // Hata durumunda kırmızı
        messageElem.style.fontWeight = 'bold'; // Hata mesajının kalınlığı
        // Hata durumunda butonu gizlemiyoruz, kullanıcı tekrar deneyebilir.
    }
}

// --- Olay Dinleyicileri ---
checkInBtn.addEventListener('click', () => sendAttendanceRecord('Giris'));

document.addEventListener('DOMContentLoaded', () => {
    statusElem.textContent = 'Lütfen konum izni verin ve Google ile oturum açın.';
    googleSignInDiv.style.display = 'block';
});
