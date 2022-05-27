import axios from 'axios';
import cron from 'cron';
import { Bot, Message } from 'mirai-js'
import config from './config';
const { cookie, token, botConfig, groups } = config;

interface StudentState {
  realname?: string,
  isStudy?: '是' | '否'
}
async function getStudentStateList(): Promise<Array<StudentState>> {
  const res = await axios.get(
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

(async () => {
  const bot = new Bot;
  await bot.open(botConfig)
  new cron.CronJob(
    '10 * * *',
    async () => {
      console.log(`task running ${new Date().toLocaleString()}`);
      const stateList = await getStudentStateList();
      const notStudyText = stateList.filter(state => state.isStudy !== '是')
        .reduce((text, state) => `${text}${text === '' ? '' : '、'}${state.realname}`, '');
      if (notStudyText !== '') {
        groups.forEach(group =>
          bot.sendMessage({
            group,
            message: new Message().addText(`未完成大学习: ${notStudyText}`),
          })
        )
      }
    }
  ).start();


})();