/**
 * ===========================================================================
 *  【严禁用于任何危害性操作】
 *
 *  本脚本会向 ARL 派发「子域爆破 / 全端口扫描 / 服务识别 / 漏洞探测」任务，
 *  属于主动扫描行为。
 *
 *  仅允许对「你拥有」或「已获得明确书面授权」的目标使用。
 *  任何未经授权的扫描、探测、入侵、数据获取均属违法，可能触犯
 *  《网络安全法》《数据安全法》《刑法》第 285 / 286 条。
 *  后果由使用者自行承担，作者不承担任何责任，也不提供滥用支持。
 *
 *  无法确认是否已获授权时，请立即停止使用。
 * ===========================================================================
 */

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
    url: 'http://domain/api/task',
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

// 运行前先打印授权提示，避免 README 被跳过
console.warn(
  [
    '',
    '==========================================================================',
    '  警告：本脚本会派发主动扫描任务（子域爆破 / 全端口 / 服务识别 / 漏洞探测）',
    '  仅允许对「你拥有」或「已获得明确书面授权」的目标使用。',
    '  未经授权的扫描、探测、入侵、数据获取均属违法，后果由使用者自行承担。',
    '  无法确认已获授权时，请立即按 Ctrl+C 停止。',
    '==========================================================================',
    '',
  ].join('\n')
);

main();
