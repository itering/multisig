import { DownOutlined, MinusCircleOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import keyring from '@polkadot/ui-keyring';
import { KeyringAddress } from '@polkadot/ui-keyring/types';
import { encodeAddress } from '@polkadot/util-crypto';
import {
  AutoComplete,
  Button,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Tag,
  Tooltip,
} from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { NETWORKS, validateMessages } from '../config';
import i18n from '../config/i18n';
import { useApi } from '../hooks';
import { Network, ShareScope, WalletFormValue } from '../model';
import { convertToSS58, getMainColor, findMultiAccount, updateMultiAccountScope } from '../utils';

interface LabelWithTipProps {
  name: string;
  tipMessage: string;
  icon?: React.ReactNode;
}

const THRESHOLD = 2;

function LabelWithTip({ name, tipMessage }: LabelWithTipProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4">
      <span>{t(name)}</span>
      <Tooltip placement="right" title={t(tipMessage)}>
        <QuestionCircleOutlined color="primary" />
      </Tooltip>
    </div>
  );
}

function confirmToAdd(accountExist: KeyringAddress, confirm: () => void) {
  return Modal.confirm({
    cancelText: <Trans>cancel</Trans>,
    okText: <Trans>confirm</Trans>,
    onOk: (close) => {
      if (confirm) {
        confirm();
      }

      close();
    },
    maskClosable: false,
    closeIcon: false,
    content: (
      <div>
        <p className="mb-4">
          <Trans>
            There is an account configured by the same member and threshold. Confirm to replace it with a new account?
          </Trans>
        </p>
        <Descriptions column={1} size="small" title={<Trans>Origin Account</Trans>}>
          <Descriptions.Item label={<Trans>name</Trans>}>{accountExist.meta.name}</Descriptions.Item>
          <Descriptions.Item label={<Trans>threshold</Trans>}>
            {/*  eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(accountExist.meta as any).threshold}
          </Descriptions.Item>
          <Descriptions.Item label={<Trans>Create Time</Trans>}>
            {format(accountExist.meta.whenCreated || 0, 'yyyy-MM-dd hh:mm:ss')}
          </Descriptions.Item>
        </Descriptions>
      </div>
    ),
  });
}

export function WalletForm() {
  const { t } = useTranslation();
  const { accounts, networkConfig, api, network } = useApi();
  const [form] = useForm();
  const history = useHistory();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [shareScope, setShareScope] = useState<ShareScope>(ShareScope.all);
  const options = useMemo<{ label: string; value: string }[]>(
    () =>
      accounts
        ?.map(({ address, meta }) => ({ label: meta?.name ? `${meta?.name} - ${address}` : address, value: address }))
        .filter(({ value }) => !selectedAccounts.includes(value)) || [],
    [accounts, selectedAccounts]
  );
  const updateSelectedAccounts = (namePath?: (string | number)[]) => {
    const selected: {
      name: string;
      address: string;
    }[] = form.getFieldValue('members') || [];
    let result = selected.map((item) => item?.address);

    if (namePath) {
      const value = form.getFieldValue(namePath);

      result = result.filter((item) => item !== value);
    }

    setSelectedAccounts(result);
  };

  return (
    <Form
      name="wallet"
      layout="vertical"
      validateMessages={validateMessages[i18n.language as 'en' | 'en-US' | 'zh-CN' | 'zh']}
      form={form}
      initialValues={{
        name: '',
        threshold: 2,
        members: [
          { name: '', address: '' },
          { name: '', address: '' },
          { name: '', address: '' },
        ],
      }}
      onFinish={async (values: WalletFormValue) => {
        const { members, name, threshold } = values;
        const signatories = members.map(({ address }) => address);
        const addressPair = members.map(({ address, ...other }) => ({
          ...other,
          address: encodeAddress(address, networkConfig.ss58Prefix),
        }));
        const exec = () => {
          try {
            keyring.addMultisig(signatories, threshold, {
              name,
              addressPair,
              genesisHash: api?.genesisHash.toHex(),
            });

            updateMultiAccountScope(values, network);
            message.success(t('success'));
            history.push('/');
          } catch (error) {
            message.error(t(error.message));
          }
        };

        const acc = findMultiAccount(values);

        if (acc) {
          confirmToAdd(acc, exec);
        } else {
          exec();
        }
      }}
      className="max-w-3xl mx-auto"
    >
      <Form.Item
        name="name"
        label={<LabelWithTip name="name" tipMessage="wallet.tip.name" />}
        rules={[{ required: true }]}
      >
        <Input size="large" />
      </Form.Item>

      <Form.Item
        name="threshold"
        label={<LabelWithTip name="threshold" tipMessage="wallet.tip.threshold" />}
        rules={[{ required: true }]}
      >
        <InputNumber size="large" min={THRESHOLD} className="w-full" />
      </Form.Item>

      <Form.Item label={<LabelWithTip name="share scope" tipMessage="wallet.tip.share" />}>
        <div className="flex items-center">
          <Form.Item name="share" rules={[{ required: true }]} initialValue={1} className="mb-0">
            <Radio.Group onChange={(event) => setShareScope(event.target.value)}>
              <Radio value={ShareScope.all}>{t('All Networks')}</Radio>
              <Radio value={ShareScope.current}>{t('Current Network')}</Radio>
              <Radio value={ShareScope.custom}>{t('Custom')}</Radio>
            </Radio.Group>
          </Form.Item>

          {shareScope === ShareScope.custom && (
            <Form.Item name="scope" rules={[{ required: true }]} initialValue={[network]} className="mb-0 flex-1">
              <Select mode="multiple" disabled={shareScope !== ShareScope.custom}>
                {NETWORKS.map((net) => (
                  <Select.Option value={net} key={net}>
                    <Tag color={getMainColor(net as Network)}>{net}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </div>
      </Form.Item>

      <LabelWithTip name="members" tipMessage="wallet.tip.members" />

      <Row gutter={10} className="bg-gray-100 dark:bg-gray-500 mt-2 mb-6 p-4 rounded-lg">
        <Col span={2}>{t('id')}</Col>
        <Col span={5}>{t('name')}</Col>
        <Col span={17}>{t('address')}</Col>
      </Row>

      <Form.List name="members">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field, index) => (
              <Row key={field.key} gutter={10} className="px-4">
                <Col span={2} className="pl-2 pt-2">
                  {index + 1}
                </Col>
                <Col span={5}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'name']}
                    fieldKey={[field.fieldKey, 'name']}
                    rules={[{ required: true, message: t('Member name is required') }]}
                  >
                    <Input size="large" placeholder={t('wallet.tip.member_name')} className="wallet-member" />
                  </Form.Item>
                </Col>

                <Col span={15}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'address']}
                    fieldKey={[field.fieldKey, 'address']}
                    validateFirst
                    rules={[
                      { required: true, message: t('Account address is required') },
                      {
                        validator: (_, value) =>
                          convertToSS58(value, networkConfig.ss58Prefix) ? Promise.resolve() : Promise.reject(),
                        message: t('You must input a ss58 format address'),
                      },
                    ]}
                  >
                    <AutoComplete
                      options={options}
                      onChange={(addr) => {
                        const account = accounts?.find((item) => item.address === addr);

                        if (!account) {
                          return;
                        }

                        const members: { name?: string; address: string }[] = form.getFieldValue('members');

                        if (account) {
                          members[index].name = account?.meta?.name ?? '';
                          form.setFieldsValue({ members: [...members] });
                        }

                        setSelectedAccounts(members.map((item) => item?.address));
                      }}
                    >
                      <Input
                        suffix={<DownOutlined className="opacity-30" />}
                        size="large"
                        placeholder={t('wallet.tip.member_address')}
                        className="wallet-member"
                      />
                    </AutoComplete>
                  </Form.Item>
                </Col>

                <Col span={2}>
                  <Form.Item>
                    <MinusCircleOutlined
                      onClick={() => {
                        updateSelectedAccounts(['members', field.name, 'address']);

                        if (fields.length > THRESHOLD) {
                          remove(field.name);
                        } else {
                          const members = form.getFieldValue('members');

                          members[index] = { name: '', address: '' };
                          form.setFieldsValue({ members: [...members] });
                          message.warn(`You must set at least ${THRESHOLD} members.`);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            ))}

            <Row>
              <Col span={24}>
                <Form.Item>
                  <Button
                    type="dashed"
                    size="large"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                    className="flex justify-center items-center w-full"
                  >
                    {t('add_members')}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Form.List>

      <Form.Item>
        <div className="w-full grid grid-cols-2 items-center gap-8">
          <Button type="primary" size="large" block htmlType="submit" className="flex justify-center items-center">
            {t('create')}
          </Button>
          <Link to="/" className="block">
            <Button type="default" size="large" className="flex justify-center items-center w-full">
              {t('cancel')}
            </Button>
          </Link>
        </div>
      </Form.Item>
    </Form>
  );
}
