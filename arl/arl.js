const axios = require('axios');
const fs = require('fs');

const POSTURL = 'https://domain/api/task/';
const TOKEN = '登陆token';

// 读取json
// 域名备案查询结果
const urls = require('./url.json');
const path = require('path');


async function main() {
  const task = urls.shift();
  // 判断任务是否存在
  if (!task) return false;
  // 从历史文件中获取是否存在当前任务
  const historyExist = await historyIsTask(task.unitName, task.domain);
  if (historyExist) {
    main()
    return console.error(`${task.unitName}-${task.domain}历史运行过`);
  }
  // 查看任务是否在列
  const flag = await taskIsExist(task.unitName, task.domain)
  if (flag) {
    console.error(`${task.unitName}-${task.domain}已存在`);
    main()
    return false;
  }
  createTask(task.unitName, task.domain);
}

async function historyIsTask(name, target) {
  const historyText = fs.readFileSync(path.resolve(__dirname, './history.txt'), { encoding: 'utf-8' });
  const historyTask = historyText.split('\n').filter(task => task);
  return historyTask.includes(`${name}-${target}`);
}

async function taskIsExist(name, target) {
  const result = await axios.request({
    url: 'http://arl.myjerry.cn/api/task',
    headers: { token: TOKEN },
    params: { name, target, },
  });
  if (result.status === 200 && result.data.code === 200) {
    const flag = result.data.items.find(item => item.target === target);
    if (result.data.total >= 1 && flag) {
      return true;
    }
    return false;
  } else {
    return false;
  }
}


async function createTask(name, target) {
  const result = await axios.post(POSTURL,
    {
      name,
      target,
      "domain_brute_type": "big",
      "port_scan_type": "all",
      "domain_brute": true,
      "alt_dns": true,
      "dns_query_plugin": true,
      "arl_search": true,
      "port_scan": true,
      "service_detection": true,
      "os_detection": true,
      "ssl_cert": true,
      "skip_scan_cdn_ip": true,
      "site_identify": true,
      "search_engines": true,
      "site_spider": true,
      "site_capture": false,
      "file_leak": true,
      "findvhost": true,
      "nuclei_scan": false,
      "web_info_hunter": true
    },
    {
      headers: {
        token: TOKEN,
      }
    }
  )
  main();
  if (result.status === 200 && result.data.code === 200) {
    console.log('create task success: name: %s, target: %s', name, target);
    // 创建成功后将该任务写入本地文件，用户历史去重
    fs.appendFileSync(path.resolve(__dirname, './history.txt'), `${name}-${target}\n`, { encoding: 'utf-8' });
  } else {
    console.warn('create task failed: name: %s, target: %s, 错误信息：%s', name, target, result.status, result.data.message);
  }
}

main();
