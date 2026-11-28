// expo-modules-jsi 58.0.x: Swift 6.2'de "sending 'slot' risks causing data races" hatasi veriyor.
// Isaretciyi Sendable bir adres degeri olarak tasiyip kapanis icinde yeniden olusturuyoruz.
const fs = require('fs');
const f = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('slotAddress')) { console.log('yama zaten uygulanmis'); process.exit(0); }
const a = `    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        try encode(JavaScriptValue.Slot(slot), runtime)
      }
    }`;
const b = `    let slotAddress = UInt(bitPattern: slot)
    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        let slotPointer = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: slotAddress)!
        try encode(JavaScriptValue.Slot(slotPointer), runtime)
      }
    }`;
if (!s.includes(a)) { console.error('HATA: yama hedefi bulunamadi (paket surumu degismis olabilir)'); process.exit(1); }
fs.writeFileSync(f, s.replace(a, b));
console.log('expo-modules-jsi yamasi uygulandi');
