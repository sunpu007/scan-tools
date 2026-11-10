// verify-ak.js
const StsClient = require('@alicloud/sts20150401');
const OpenApi = require('@alicloud/openapi-client');

async function verifyAccessKey(accessKeyId, accessKeySecret) {
  // 1. 构造配置
  const config = new OpenApi.Config({
    accessKeyId: accessKeyId,
    accessKeySecret: accessKeySecret,
  });
  config.endpoint = 'sts.aliyuncs.com';

  // 2. 初始化客户端
  const client = new StsClient.default(config);

  try {
    // 3. 直接调用，不需要 new Request 对象
    const response = await client.getCallerIdentity();
    
    console.log('✅ AccessKey 有效');
    // response.body 里包含 AccountId, Arn, UserId 等信息
    console.log('账号信息:', JSON.stringify(response.body, null, 2));
    return true;
  } catch (error) {
    console.log('❌ AccessKey 无效或验证失败');
    // 打印详细的错误信息，便于排查是 ID 错、Secret 错还是权限不足
    console.log('错误码:', error.code);
    console.log('错误信息:', error.message);
    return false;
  }
}

// 从环境变量读取，避免密钥硬编码在脚本里
const ak = '';
const sk = '';

verifyAccessKey(ak, sk);