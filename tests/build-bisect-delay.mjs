await new Promise(resolve=>setTimeout(resolve,20000));
console.log(JSON.stringify({ok:true,suite:"temporary-build-bisect-delay",seconds:20}));
