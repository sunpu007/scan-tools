// This file is auto-generated, don't edit it
import ECS, * as $ECS from '@alicloud/ecs20140526';
import * as $OpenApi from '@alicloud/openapi-client';
import Console from '@alicloud/tea-console';


export default class Client {

  static async main(): Promise<void> {
    // 1. 初始化配置
    let config = new $OpenApi.Config({ });
    // 您的AccessKey ID
    config.accessKeyId = '';
    // 您的AccessKey Secret
    config.accessKeySecret = '';
    //设置请求地址
    config.endpoint = "ecs.aliyuncs.com";
    // 设置连接超时为5000毫秒
    config.connectTimeout = 5000;
    // 设置读超时为5000毫秒
    config.readTimeout = 5000;
    // 2. 初始化客户端
    let client = new ECS(config);
    // let regionIds = ['cn-hangzhou'];
    let regionIds = [
      "cn-hangzhou",
      "cn-shanghai",
      "cn-qingdao",
      "cn-beijing",
      "cn-zhangjiakou",
      "cn-huhehaote",
      // "cn-wulanchabu",
      "cn-shenzhen",
      "cn-heyuan",
      // "cn-guangzhou",
      "cn-chengdu",
      "cn-hongkong"
    ];

    for (let regionId of regionIds) {
      let describeInstancesRequest = new $ECS.DescribeInstancesRequest({
        pageSize: 100,
        regionId: regionId,
      });
      try {
        let resp = await client.describeInstances(describeInstancesRequest);
        let instances = resp.body.instances.instance;
        Console.log(`${regionId} 下 ECS 实例列表:`);

        for (let instance of instances) {
          Console.log(`  ${instance.hostName} 实例ID ${instance.instanceId} CPU:${instance.cpu}  内存:${instance.memory} MB 规格：${instance.instanceType} 系统:${instance.OSType}(${instance.OSName}) 状态：${instance.status}`);
        }
      } catch (err) {
        console.log('regionId===>', regionId, err);
      }
    }
  }

}

Client.main();