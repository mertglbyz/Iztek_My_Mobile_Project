const fs = require('fs');
const path = require('path');

// Derlenmiş olan built dosyasından değilse de ts-node üzerinden çağrılabilecek şekilde tasarlandı
const { findRoutes } = require('../services/tripPlanner.ts'.replace('.ts', ''));
// Not: Expo vs ayarları nedeniyle doğrudan import zor olabilir, o yüzden bu dosyayı Jest içerisinde test şeklinde sarmalayarak çalıştıralım, bu çok daha pratik.

