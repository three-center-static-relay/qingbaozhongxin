await new Promise(resolve=>setTimeout(resolve,12000));
console.log(JSON.stringify({ok:true,suite:"temporary-build-bisect-delay",seconds:12}));
