import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedData1700000000001 implements MigrationInterface {
  name = 'SeedData1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DELETE FROM notifications; DELETE FROM notification_preferences;
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('ffbe64a4-dbba-58b8-a95c-1dddc95c971b', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('53dfcaa2-b9a6-5984-b71b-5437a65c301a', 'ffbe64a4-dbba-58b8-a95c-1dddc95c971b', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('d35a2a2a-d1d1-55ed-90a7-348c3da59deb', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('11896377-13c4-5469-8456-d4a3461022b1', 'd35a2a2a-d1d1-55ed-90a7-348c3da59deb', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('1e5f1a27-4c4e-5b84-b4dd-5227b40c755d', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('b1b8719e-5907-5a38-b98d-59347056cf11', '1e5f1a27-4c4e-5b84-b4dd-5227b40c755d', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('8e366a8d-6e18-50fd-98d9-2efd6d246b24', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('f3b8aa11-e286-590b-b794-563477a91327', '8e366a8d-6e18-50fd-98d9-2efd6d246b24', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('dbc080c1-f33d-5a36-8bd2-68fb0d20f0db', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('fec7aef7-08e4-5631-a585-b88fe1731d14', 'dbc080c1-f33d-5a36-8bd2-68fb0d20f0db', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('01235d01-f261-55ab-b63d-d2a10cad9e11', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('10233b03-a5ed-513c-8076-4bf1cdfbc19c', '01235d01-f261-55ab-b63d-d2a10cad9e11', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('5d7e3982-b4cf-5ca6-9734-744833b910a3', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('848c9d0a-abb1-55c2-8e34-7bdfc546d258', '5d7e3982-b4cf-5ca6-9734-744833b910a3', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('933a1a70-8683-5fea-8b3c-02459adb5f31', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('ac0b8bdf-bb8e-564e-a61c-2ddd5af0b159', '933a1a70-8683-5fea-8b3c-02459adb5f31', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('52388865-df5d-5f46-8df6-034d113e9391', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('58b578e5-48b0-5669-9c22-acd7e263b3e3', '52388865-df5d-5f46-8df6-034d113e9391', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('a710b314-b7cc-51d3-97ed-52f7aedba4c0', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('5b323eed-dfa4-5b2a-af65-39c183497116', 'a710b314-b7cc-51d3-97ed-52f7aedba4c0', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('3ee066f5-64b0-5b81-b4fc-d8f8ede23ed0', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('e9a4bc12-2667-52e3-ab90-2a2f9032ce9a', '3ee066f5-64b0-5b81-b4fc-d8f8ede23ed0', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('271814b9-df4f-5305-9347-898e83e672dc', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('2b4d5e96-2562-51d9-85e6-6f391d46ce1f', '271814b9-df4f-5305-9347-898e83e672dc', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('4025932a-8150-5165-bec3-726ec0f47e30', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('45206358-b37f-5a1a-bebe-ba61745cf105', '4025932a-8150-5165-bec3-726ec0f47e30', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('39ee98d1-7b3e-5a28-ba39-01ed2143fe0c', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('7557a34c-2a25-5900-86dc-0149f1a36e02', '39ee98d1-7b3e-5a28-ba39-01ed2143fe0c', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('bf64b951-8954-58bf-8ec9-1f194c017fe8', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('92644875-5750-5949-a590-03fef6203b36', 'bf64b951-8954-58bf-8ec9-1f194c017fe8', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('26ab961d-925c-5bc7-9ec5-ae404a745994', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('3f55291a-3562-53ab-a7cd-e8e5c7bf9206', '26ab961d-925c-5bc7-9ec5-ae404a745994', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('3e7f0120-56df-5222-a8cb-a2fd1503ce12', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('2082cd37-f1d3-51f6-9412-1394c20ed95d', '3e7f0120-56df-5222-a8cb-a2fd1503ce12', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('8832e9ea-50d2-51bd-b830-f9b00ba05c0d', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('c07ce2a9-2df9-563c-b335-09efad029162', '8832e9ea-50d2-51bd-b830-f9b00ba05c0d', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('3bb888f3-2438-5063-9ccd-da15bbd1f77a', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('c75799c0-d564-5420-86c1-cbdd8718b406', '3bb888f3-2438-5063-9ccd-da15bbd1f77a', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('7b1c4501-a453-5d5e-964d-c2067b69e22b', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('1d51d11f-8d24-5845-9b81-ef1248a2eafd', '7b1c4501-a453-5d5e-964d-c2067b69e22b', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('236eebf6-c1d8-59c9-8b94-e411fe443fe2', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('46f92fde-3353-5a4e-be7c-bbd982455353', '236eebf6-c1d8-59c9-8b94-e411fe443fe2', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('2fd0a02e-a1ce-56b3-8e11-5e93dcc1a578', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('93cd303e-6acc-541b-a984-a8dd505af455', '2fd0a02e-a1ce-56b3-8e11-5e93dcc1a578', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('c83e18dd-78e7-5b2f-a861-cd4144abcab4', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('c7a05fcf-67ed-5897-919d-4089939a7bdb', 'c83e18dd-78e7-5b2f-a861-cd4144abcab4', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('7c516c1d-caef-5910-ba7e-6485e2b7814d', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('f501222b-07c9-58e1-b502-106493df799a', '7c516c1d-caef-5910-ba7e-6485e2b7814d', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('f3fd07bb-bcce-5221-acfc-9c4b47bfb503', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('152e9b44-d46a-5616-ba0b-54f48557c0a3', 'f3fd07bb-bcce-5221-acfc-9c4b47bfb503', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('baa8e5dc-51ce-52d7-afc6-7b11717b1c3c', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('79395943-7989-5604-bab0-0598c6464466', 'baa8e5dc-51ce-52d7-afc6-7b11717b1c3c', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('af9af84a-32ef-5b72-8ad4-6ade43058177', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('55fca891-ed46-5c91-b265-70cf95d70ddc', 'af9af84a-32ef-5b72-8ad4-6ade43058177', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('bf28724e-6874-5301-bb45-9cc1c3a83264', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('e141839f-f27f-5989-964d-318b8a1c2816', 'bf28724e-6874-5301-bb45-9cc1c3a83264', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('a933b175-bd4e-5b34-9ed2-eebda9e85c0c', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('ac94b646-8814-59cf-ae79-96635753ffda', 'a933b175-bd4e-5b34-9ed2-eebda9e85c0c', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('d42a10d7-70f3-563e-acd1-48f1259cc594', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('3ff40f95-fa02-5e38-a403-b01b38a5f348', 'd42a10d7-70f3-563e-acd1-48f1259cc594', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('c8ae5320-812f-5cdd-9d7e-a73fff78c8da', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('3e5a6d7a-da16-551d-9c22-57484531c8ff', 'c8ae5320-812f-5cdd-9d7e-a73fff78c8da', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('1b82e80d-8d17-5c36-93ac-82dde0a249cc', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('94b818d4-c296-509d-80fb-a03de1ae1b70', '1b82e80d-8d17-5c36-93ac-82dde0a249cc', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('d5aa7d32-b6ee-53a2-9798-59e28c73cf01', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('467eebcc-b83a-5449-b866-7b232d8b2fa5', 'd5aa7d32-b6ee-53a2-9798-59e28c73cf01', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('b3b57725-54e7-567b-a432-9c0e39a42678', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('7a5b3d32-0562-540b-ad73-6a3cc9ec3845', 'b3b57725-54e7-567b-a432-9c0e39a42678', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('531f477a-1f91-5fa8-a711-842e9559e59b', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('9bf9b1e8-880d-5ad5-a771-2eb1373cd6da', '531f477a-1f91-5fa8-a711-842e9559e59b', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('6776c62f-74e6-5ea9-b85d-f83a590f8325', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('c68bcce5-3fa9-5025-9de1-f18be201ecab', '6776c62f-74e6-5ea9-b85d-f83a590f8325', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('6fee1d8c-7182-56b9-9ba2-e9f2f96d1864', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('02c44f2d-7a50-50c5-ba98-04410bb77927', '6fee1d8c-7182-56b9-9ba2-e9f2f96d1864', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('c59c4df8-9179-503d-bd34-6fb4baabf1b0', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('89540ddf-5865-5f2a-8a77-e9bf1551a857', 'c59c4df8-9179-503d-bd34-6fb4baabf1b0', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('3fa31b52-0810-5943-9d35-6476cf9db35a', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('871348c9-7b87-5b17-85d6-0010e876aac9', '3fa31b52-0810-5943-9d35-6476cf9db35a', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('778d3881-1196-54ca-a703-df5e6a37289a', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('f15537ec-5c4d-53c8-9d24-351d212ef83c', '778d3881-1196-54ca-a703-df5e6a37289a', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('ec1449ec-b187-52e3-a8d6-ce82bca66872', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('5c43ae22-3d99-5987-981e-cf316484fd13', 'ec1449ec-b187-52e3-a8d6-ce82bca66872', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('8308a3ad-4cd4-5b79-88e3-69b6fe06cc4d', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('045435f8-b5a5-575e-ada2-22ed9792df8a', '8308a3ad-4cd4-5b79-88e3-69b6fe06cc4d', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('2991bdff-0fee-52e0-90c1-c76c57de7a2f', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('ab9e48b2-93ed-5dcb-9e0e-ec0215cec48d', '2991bdff-0fee-52e0-90c1-c76c57de7a2f', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('b8343a45-5aaf-5dbb-8796-6ce70c45a210', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('61d91ab4-4420-5380-9c86-27d393d78d3a', 'b8343a45-5aaf-5dbb-8796-6ce70c45a210', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('30641e26-4543-5b24-8018-537783c153a1', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('5b035199-4558-5f14-a927-8099a8853434', '30641e26-4543-5b24-8018-537783c153a1', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('29137d1a-a404-5036-b164-b067b18c46c8', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('79ed6e75-577b-5803-8ae2-9cd552ec6335', '29137d1a-a404-5036-b164-b067b18c46c8', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('c1197fb8-9baa-5afd-be52-e127d9606ff1', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('fc588c22-bb91-5798-9101-84cf91d26bb7', 'c1197fb8-9baa-5afd-be52-e127d9606ff1', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('d2054af8-db53-552b-8139-22b29f33fd7c', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('7d1fabe6-7312-5f87-9d0b-cd1584495951', 'd2054af8-db53-552b-8139-22b29f33fd7c', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('123d15b8-ab1d-5274-8521-e4abad76181d', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('fb00d103-c2de-5cdb-bb43-69bd50415e17', '123d15b8-ab1d-5274-8521-e4abad76181d', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
INSERT INTO notification_preferences (user_id, enable_push) VALUES ('a96f2a6e-7a00-581d-858d-371b82f96317', true);
INSERT INTO notifications (id, user_id, type, channel, title, body) VALUES ('3eaccacd-c0d7-5dde-8e6e-d8f279712aa3', 'a96f2a6e-7a00-581d-858d-371b82f96317', 'system', 'push', 'Welcome', 'Welcome to EV Platform');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert seed
  }
}
