import axios from 'axios';
import config from './config'
const { recognizeConfig } = config;

export async function recognize(base64: string): Promise<{ code: string, id: string }> {
  // 4004
  const res = await axios.post('http://upload.chaojiying.net/Upload/Processing.php', {
    user: recognizeConfig.username,
    pass: recognizeConfig.password,
    softid: recognizeConfig.softid,
    codetype: recognizeConfig.codetype,
    len_min: recognizeConfig.len_min,
    file_base64: base64,
  });
  // const res = { data: { err_no: 0, pic_str: '1', pic_id: '11', err_str: '' } };
  if (res.data?.err_no === 0) {
    return { code: res.data?.pic_str, id: res.data?.pic_id };
  } else {
    throw Error(res.data.err_str);
  }
}

export async function reportError(picId: string): Promise<void> {
  const res = await axios.post('http://upload.chaojiying.net/Upload/ReportError.php', {
    user: recognizeConfig.username,
    pass: recognizeConfig.password,
    softid: recognizeConfig.softid,
    id: picId,
  });
  if (res.data?.err_no === 0) {
    return;
  } else {
    throw new Error(res.data.err_str);
  }
}