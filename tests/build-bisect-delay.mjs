await new Promise(resolve=>setTimeout(resolve,60000));
console.log(JSON.stringify({ok:true,suite:"temporary-build-bisect-delay",seconds:60}));
