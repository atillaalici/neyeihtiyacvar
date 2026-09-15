# Neye Ihtiyac Var - Otomatik Testler

## Frontend kalite
pnpm run test:quality

## Frontend E2E
Ilk kullanim:
pnpm exec playwright install chromium

Sonra:
pnpm run build
pnpm run test:e2e

## Backend
dotnet test backend/NeyeIhtiyacVar.Api.Tests/NeyeIhtiyacVar.Api.Tests.csproj -c Release

## Not
E2E smoke testleri public rotalarin HTTP hatasi vermedigini ve ana sayfa markasinin gorundugunu kontrol eder.
Sonraki asamada login, kayit, ihtiyac olusturma ve isletme uyelik akislari icin veri tabanli entegrasyon testleri eklenecektir.