import os from 'node:os';

// Beberapa sandbox Windows tidak menyediakan informasi akun OS kepada Node.
// `tsx` hanya memakainya untuk memilih direktori sementara, jadi gunakan
// workspace sebagai fallback khusus ketika panggilan native tersebut gagal.
try {
  os.userInfo();
} catch {
  os.userInfo = () => ({
    username: 'test-runner',
    uid: -1,
    gid: -1,
    shell: null,
    homedir: process.cwd(),
  });
}
