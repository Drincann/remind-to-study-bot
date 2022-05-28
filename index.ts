import axios, { Axios } from 'axios';
import { CronJob } from 'cron';
import { Bot, Message } from 'mirai-js'
import config from './config';
import { recognize, reportError } from './recognize';
const { username, password, botConfig, groups, cronString } = config;
const bot = new Bot;
const axiosApp = (() => {
  let cookie: string[] = [];
  return new Axios({
    withCredentials: true,
    transformRequest: [function transformRequest(data, header) {
      if (cookie?.length > 0 && header !== undefined) {
        header['cookie'] = cookie.join(';');
      }
      return JSON.stringify(data);
    }],
    transformResponse: [function transformResponse(data, header) {
      if (header !== undefined && header['set-cookie'] !== undefined) {
        cookie = header['set-cookie'];
      }
      try {
        return JSON.parse(data);
      } catch (err) {
        return data;
      }
    }]
  });
})();

interface StudentState {
  realname?: string,
  isStudy?: '是' | '否'
}
type base64 = string;
const CAPTCHA_FAIL_CODE = 1001;
const CATPCHA_FAIL_STR = '验证码错误';

async function getCaptcha(): Promise<base64> {
  const res = await axiosApp.get('https://bgapi.54heb.com/login/verify', { responseType: 'arraybuffer' });
  if (res.data === null) { throw Error('getCaptcha error'); }
  return Buffer.from(res.data, 'binary').toString('base64');
}

async function login(username: string, password: string, code: string): Promise<{ token: string }> {
  const res = await axiosApp.post('https://bgapi.54heb.com/admin/login', {
    account: username,
    is_quick: 0,
    pass: password,
    verify: code,
  }, { withCredentials: true });
  if (res.data?.code === CAPTCHA_FAIL_CODE) {
    throw Error(CATPCHA_FAIL_STR);
  }
  if (res.data?.code !== 0) throw Error(res.data.msg);
  return res.data?.data?.[0];
}

async function getStudentStateList(token: string): Promise<Array<StudentState>> {

  var res = await axiosApp.get(
    'https://bgapi.54heb.com/regiment',
    {
      params: {
        page: 1, rows: 30,
        oid: 100463249,
      },
      headers: {
        // cookie
        token
      }
    }
  );



  if (res.data?.code !== 0) { throw Error(res.data.msg); }
  const resList = res.data?.data?.data;

  if (resList === null || !Array.isArray(resList)) { throw Error(JSON.stringify(res.data?.data)) };

  return resList;
  // res.data.data.data: {realname: string, isStudy: '是' | '否'}
  // res.data.msg res.data.code
}

async function task() {
  console.log(`task running ${new Date().toLocaleString()}`);
  let captchaRecognizeId = '';
  try {
    const captchaBase64 = await getCaptcha();
    const { code, id } = await recognize(captchaBase64); captchaRecognizeId = id;
    const { token } = await login(username, password, code);
    const stateList = await getStudentStateList(token);
    const notStudyText = stateList.filter(state => state.isStudy !== '是')
      .reduce((text, state) => `${text}${text === '' ? '' : '、'}${state.realname}`, '');

    if (notStudyText !== '') {
      groups.forEach(group => bot.sendMessage({
        group, message: new Message().addText(`未完成大学习: ${notStudyText}`),
      }))
      console.log(`未完成大学习: ${notStudyText}`);
    } else {
      console.log('没有发现未完成大学习的同学');
    }
  } catch (error) {
    console.error(error);
    if ((error as Error)?.message === CATPCHA_FAIL_STR) {
      try {
        await reportError(captchaRecognizeId);
      } catch (error) {
        groups.forEach(group => bot.sendMessage({
          group, message: new Message().addText(`识别验证码报错失败, msg: ${(error as Error)?.message}`),
        }))
      }
    }
  }
}

(async () => {
  await bot.open(botConfig); await task();
  new CronJob(cronString ?? '0 0 10 * * *', task).start();
})();