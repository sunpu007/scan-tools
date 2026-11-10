import ECS, * as $ECS from '@alicloud/ecs20140526';
import BssOpenApi, * as $BSS from '@alicloud/bssopenapi20171214';
import * as $OpenApi from '@alicloud/openapi-client';
import Console from '@alicloud/tea-console';

export default class Client {
  static async main(): Promise<void> {
    const config = new $OpenApi.Config({});
    // 您的AccessKey ID
    config.accessKeyId = '';
    // 您的AccessKey Secret
    config.accessKeySecret = '';
    config.connectTimeout = 5000;
    config.readTimeout = 5000;

    // BSS 费用中心客户端，固定杭州
    const bssConfig = new $OpenApi.Config(config);
    bssConfig.regionId = "cn-hangzhou";
    bssConfig.endpoint = "business.aliyuncs.com";
    const bssClient = new BssOpenApi(bssConfig);

    const regionIds = [
      "cn-hangzhou",
      "cn-shanghai",
      "cn-qingdao",
      "cn-beijing",
      "cn-zhangjiakou",
      "cn-huhehaote",
      "cn-shenzhen",
      "cn-heyuan",
      "cn-chengdu",
      "cn-hongkong"
    ];

    // ========== 分页获取BSS最近90天全部订单 ==========
    const instanceOrderMap = new Map<string, any>();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    let bssNextToken: string | undefined = undefined;
    do {
      const queryOrderReq = new $BSS.QueryOrdersRequest({
        CreateTimeStart: startDate.toISOString(),
        NextToken: bssNextToken,
      });
      const orderResp = await bssClient.queryOrders(queryOrderReq);
      if (orderResp.body?.Orders?.Order) {
        for (const order of orderResp.body.Orders.Order) {
          if (order?.ResourceInstanceId) {
            instanceOrderMap.set(order.ResourceInstanceId, order);
          }
        }
      }
      bssNextToken = orderResp.body?.NextToken;
    } while (bssNextToken);


    // ========== 遍历所有地域，分页拉取ECS实例 ==========
    for (const regionId of regionIds) {
      try {
        const ecsConfig = new $OpenApi.Config(config);
        ecsConfig.regionId = regionId;
        const ecsClient = new ECS(ecsConfig);

        let ecsNextToken: string | undefined = undefined;
        Console.log(`\n===== ${regionId} 下 ECS实例+订单信息 =====`);
        do {
          // ✅ 重点：DescribeInstancesRequest 必须显式传入 regionId
          const req = new $ECS.DescribeInstancesRequest({
            pageSize: 100,
            regionId: regionId,
            NextToken: ecsNextToken,
          });
          const resp = await ecsClient.describeInstances(req);
          const instances = resp.body.instances.instance ?? [];

          for (const instance of instances) {
            const orderInfo = instanceOrderMap.get(instance.instanceId);
            Console.log(`实例ID:${instance.instanceId}
计费类型：${instance.instanceChargeType}
订单号：${orderInfo?.OrderId ?? "无订单（按量付费/不在90天订单内）"}
订单金额：${orderInfo?.TotalAmount ?? ''}
到期时间：${instance.expiredTime ?? '按量无到期时间'}
--------------------------------------------`);
          }
          ecsNextToken = resp.body.nextToken;
        } while (ecsNextToken);

      } catch (err) {
        console.error('regionId===>', regionId, err);
      }
    }
  }
}

Client.main();
