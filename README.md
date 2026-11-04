# CRONO

Aplicație cronometru pentru **iOS și Android**, construită cu React Native, Expo SDK 57 și TypeScript. Include și o versiune web pentru previzualizare.

## Pornire rapidă

Deschide un terminal în `D:\App_Crono`:

```powershell
npm install
npm start
```

Instalează **Expo Go** pe telefon și scanează codul QR afișat în terminal. Calculatorul și telefonul trebuie să fie în aceeași rețea. Pentru iPhone, dacă Expo Go cere autentificare, folosește același cont Expo pe telefon și în terminal (`npx expo login`).

```powershell
npm run web       # previzualizare în browser
npm run android   # deschidere pe un emulator Android deja configurat
```

Pe Windows, iPhone-ul fizic poate rula aplicația în Expo Go. Simulatorul iOS și compilarea locală pentru iOS necesită macOS și Xcode.

## Funcții

- Pornire, pauză, reluare și resetare cu confirmare.
- Afișare la sutimi de secundă; orele apar automat pentru sesiuni lungi.
- Ture cu durată individuală și timp cumulat; evidențierea celor mai rapide ture și media lor.
- Salvarea sesiunilor, vizualizarea detaliilor, distribuirea rezultatelor și ștergerea cu confirmare.
- Păstrarea ultimelor 50 de sesiuni, până la 1.000 de ture pe sesiune.
- Recuperarea cronometrului activ, turelor și setărilor după reînchiderea aplicației.
- Feedback tactil și menținerea ecranului activ pe telefon, fiecare cu opțiune separată.
- Interfață în română, fonturi incluse în aplicație, fără cont sau server propriu.

Apasă **Pauză → Salvează sesiunea** pentru a păstra rezultatul și a pregăti un nou cronometru. În **Istoric**, atinge o sesiune pentru detalii și distribuire. Pe web, rezultatele se copiază în clipboard dacă browserul nu oferă distribuire nativă.

## Cum este măsurat timpul

Cronometrul calculează diferența dintre marcaje temporale, fără a aduna tick-uri de interval. Astfel, timpul petrecut în fundal sau cu telefonul blocat este inclus la revenire. Afișarea se actualizează la aproximativ 32 ms; aceasta nu constituie o garanție de precizie metrologică. Schimbarea manuală a ceasului dispozitivului poate afecta sesiunea în curs.

Datele sunt stocate local cu AsyncStorage. Dezinstalarea aplicației sau ștergerea datelor browserului elimină istoricul. Setările de vibrație și ecran activ se aplică numai pe dispozitivele mobile. Menținerea ecranului activ funcționează cât timp aplicația se află în prim-plan.

## Verificări

Necesită Node.js 24 LTS sau mai nou pentru testele care execută TypeScript direct.

```powershell
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run export
npx expo-doctor
```

Testele de interfață folosesc Google Chrome instalat local și pornesc automat aplicația pe portul 8091. Previzualizările sunt salvate în `previews/`, iar rezultatele temporare în `test-results/`.

## Pachete instalabile

Configurația `eas.json` include profilul `preview` pentru APK Android și `production` pentru distribuție. Identificatorul inițial este `ro.appcrono.mobile` pentru ambele platforme; adaptează-l dacă ai un identificator propriu.

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npm run build:android
npm run build:ios
```

Compilările în cloud necesită un cont Expo și configurarea semnării. Distribuirea pentru iOS necesită un cont Apple Developer și înregistrarea aplicației. Crearea codului sursă și verificările locale nu publică aplicația în magazine.

Documentație oficială: [Expo Go și inițializare](https://docs.expo.dev/tutorial/create-your-first-app/), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [build-uri Android/iOS](https://docs.expo.dev/build/introduction/).

## AI Factory

AI Factory **2.21.0** este instalat global și inițializat pentru Codex app în acest proiect. Cele 33 de skill-uri sunt în `.agents/skills/`, inventarul instalării în `.ai-factory.json`, iar setările în `.ai-factory/config.yaml`.

Deschide proiectul `D:\App_Crono` în Codex. Skill-urile se pot folosi dintr-un mesaj nou, de exemplu `$aif-plan` pentru o funcție nouă. Comanda `$aif` pornește analiza și configurarea suplimentară a contextului proiectului. Instalarea de față nu a rulat această analiză.

```powershell
ai-factory --version
ai-factory update
```

Sursa: [lee-to/ai-factory](https://github.com/lee-to/ai-factory).

## Starea verificării

Verificările de logică și interfață acoperă măsurarea timpului, turele, pauza/reluarea, restaurarea după reîncărcare, istoricul, setările și confirmările. Exportul JavaScript/Hermes pentru Android și iOS nu înlocuiește testarea pe telefoane fizice. Nu s-au efectuat compilări semnate APK/IPA sau publicări în magazine.

La instalare, `npm audit` a raportat vulnerabilități în dependențe tranzitive Expo și în instrumentele de dezvoltare, inclusiv `decode-uri-component` și `zod`. Au fost aplicate actualizările compatibile disponibile; nu au fost forțate migrări la alte versiuni majore de SDK. Auditul trebuie reevaluat înainte de o distribuire publică.

## Structură

```text
src/app/          Ecrane și navigare Expo Router
src/components/   Cadran, ture, ferestre și setări
src/context/      Stare comună, feedback tactil, ecran activ
src/core/         Logica pură a cronometrului și validarea datelor
src/hooks/        Stocare locală serializată și restaurarea sesiunii
tests/            Teste de logică și de interfață
assets/           Fonturi din dependențe, iconițe și ecran de pornire
```
