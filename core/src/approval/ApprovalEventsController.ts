import { Mutex } from 'async-mutex';
import { isZeroAddress } from 'ethereumjs-util';
import AssetsContractController from '../assets/AssetsContractController';
import BscContractController from '../assets/BscContractController';
import PolygonContractController from '../assets/PolygonContractController';
import ArbContractController from '../assets/ArbContractController';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import BscNetworkController from '../network/BscNetworkController';
import NetworkController from '../network/NetworkController';
import PolygonNetworkController from '../network/PolygonNetworkController';
import ArbNetworkController from '../network/ArbNetworkController';
import TransactionController, {
  TransactionInfo,
  TransactionStatus,
  TxChangedType,
} from '../transaction/TransactionController';
import util, { bitAND, logDebug } from '../util';
import { getContractController } from '../ControllerUtils';
import HecoNetworkController from '../network/HecoNetworkController';
import HecoContractController from '../assets/HecoContractController';
import OpNetworkController from '../network/OpNetworkController';
import OpContractController from '../assets/OpContractController';
import { Sqlite } from '../transaction/Sqlite';
import AvaxNetworkController from '../network/AvaxNetworkController';
import AvaxContractController from '../assets/AvaxContractController';
import SyscoinNetworkController from '../network/SyscoinNetworkController';
import SyscoinContractController from '../assets/SyscoinContractController';

const APPROVAL_METHOD_ID = '0x095ea7b3';

/**
 * @property allEvents - myAddress : event group
 */
export interface ApprovalEventsState extends BaseState {
  allEvents: { [key: string]: { [key: string]: { [key: string]: EventGroup } } }; // myAddress: chainId: token: EventGroup
  updateTime: number;
}

/**
 * @property address - contract address
 * @property name - contract name, like uniswap ...
 * @property riskLevel - safe or risk
 */
export interface Contract {
  chain: string;
  address: string;
  name: string;
  status: number; // 0: unknown; 1: safe; 2: risk;
}

/**
 * @property token - tokenAddress
 * @property network - which chain the token deployed
 * @property approvals - the approval event array
 */
export interface EventGroup {
  token: string;
  chainId: string;
  approvals: { [key: string]: Event }; // spender: Event
}

/**
 * @type Event - Approval Event
 */
export interface Event {
  spender: string;
  initAllowance: string;
  allowance: number;
  timestamp: string;
}

export class ApprovalEventsController extends BaseController<BaseConfig, ApprovalEventsState> {
  private mutex = new Mutex();

  /**
   * Name of this controller used during composition
   */
  name = 'ApprovalEventsController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = [
    'AssetsController',
    'NetworkController',
    'BscNetworkController',
    'PolygonNetworkController',
    'HecoNetworkController',
    'ArbNetworkController',
    'AvaxNetworkController',
    'SyscoinNetworkController',
    'TransactionController',
    'AssetsContractController',
    'BscContractController',
    'PolygonContractController',
    'ArbContractController',
    'HecoContractController',
    'AvaxContractController',
    'SyscoinContractController',
  ];

  /**
   * Creates a AssetsDetectionController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<BaseConfig>, state?: Partial<ApprovalEventsState>) {
    super(config, state);
    this.defaultState = {
      allEvents: {},
      updateTime: 0,
    };
    this.initialize();
  }

  async onComposed() {
    super.onComposed();
    const transaction = this.context.TransactionController as TransactionController;
    const network = this.context.NetworkController as NetworkController;
    const bscNetwork = this.context.BscNetworkController as BscNetworkController;
    const polygonNetwork = this.context.PolygonNetworkController as PolygonNetworkController;
    const hecoNetwork = this.context.HecoNetworkController as HecoNetworkController;
    const arbNetwork = this.context.ArbNetworkController as ArbNetworkController;
    const opNetwork = this.context.OpNetworkController as OpNetworkController;
    const avaxNetwork = this.context.AvaxNetworkController as AvaxNetworkController;
    const syscoinNetwork = this.context.SyscoinNetworkController as SyscoinNetworkController;
    transaction.subscribe(({ txChangedType, addressWithChanged }) => {
      if (bitAND(txChangedType, TxChangedType.TxChanged) !== 0) {
        this.filterApprovalEventForAddress(network.state.provider.chainId, addressWithChanged);
      } else if (bitAND(txChangedType, TxChangedType.BscTxChanged) !== 0) {
        this.filterApprovalEventForAddress(bscNetwork.state.provider.chainId, addressWithChanged);
      } else if (bitAND(txChangedType, TxChangedType.PolygonTxChanged) !== 0) {
        this.filterApprovalEventForAddress(polygonNetwork.state.provider.chainId, addressWithChanged);
      } else if (bitAND(txChangedType, TxChangedType.ArbTxChanged) !== 0) {
        this.filterApprovalEventForAddress(arbNetwork.state.provider.chainId, addressWithChanged);
      } else if (bitAND(txChangedType, TxChangedType.HecoTxChanged) !== 0) {
        this.filterApprovalEventForAddress(hecoNetwork.state.provider.chainId, addressWithChanged);
      } else if (bitAND(txChangedType, TxChangedType.OpTxChanged) !== 0) {
        this.filterApprovalEventForAddress(opNetwork.state.provider.chainId, addressWithChanged);
      } else if (bitAND(txChangedType, TxChangedType.AvaxTxChanged) !== 0) {
        this.filterApprovalEventForAddress(avaxNetwork.state.provider.chainId, addressWithChanged);
      } else if (bitAND(txChangedType, TxChangedType.SyscoinTxChanged) !== 0) {
        this.filterApprovalEventForAddress(syscoinNetwork.state.provider.chainId, addressWithChanged);
      }
    });
  }

  async refreshAllowances(myAddress: string) {
    const network = this.context.NetworkController as NetworkController;
    const ethChainId = network.state.provider.chainId;
    const bscNetwork = this.context.BscNetworkController as BscNetworkController;
    const bscChainId = bscNetwork.state.provider.chainId;
    const polygonNetwork = this.context.PolygonNetworkController as PolygonNetworkController;
    const polygonChainId = polygonNetwork.state.provider.chainId;
    const arbNetwork = this.context.ArbNetworkController as ArbNetworkController;
    const arbChainId = arbNetwork.state.provider.chainId;
    const hecoNetwork = this.context.HecoNetworkController as HecoNetworkController;
    const hecoChainId = hecoNetwork.state.provider.chainId;
    const opNetwork = this.context.OpNetworkController as OpNetworkController;
    const opChainId = opNetwork.state.provider.chainId;
    const avaxNetwork = this.context.AvaxNetworkController as AvaxNetworkController;
    const avaxChainId = avaxNetwork.state.provider.chainId;
    const syscoinNetwork = this.context.SyscoinNetworkController as SyscoinNetworkController;
    const syscoinChainId = syscoinNetwork.state.provider.chainId;
    const assetsContractController = this.context.AssetsContractController as AssetsContractController;
    const bscContractController = this.context.BscContractController as BscContractController;
    const polygonContractController = this.context.PolygonContractController as PolygonContractController;
    const hecoContractController = this.context.HecoContractController as HecoContractController;
    const arbContractController = this.context.ArbContractController as ArbContractController;
    const opContractController = this.context.OpContractController as OpContractController;
    const avaxContractController = this.context.AvaxContractController as AvaxContractController;
    const syscoinContractController = this.context.SyscoinContractController as SyscoinContractController;
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, ethChainId, assetsContractController));
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, bscChainId, bscContractController));
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, polygonChainId, polygonContractController));
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, arbChainId, arbContractController));
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, opChainId, opContractController));
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, hecoChainId, hecoContractController));
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, avaxChainId, avaxContractController));
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, syscoinChainId, syscoinContractController));
    this.update({ updateTime: Date.now() });
  }

  async refreshOneChainAllowances(myAddress: string, chainId: string) {
    const { contractController } = getContractController(this.context, chainId);
    if (!contractController) {
      return;
    }
    await util.safelyExecute(() => this.refreshSingleChainAllowance(myAddress, chainId, contractController));
  }

  async refreshMyEventGroups(myAddress: string, chainId: string) {
    try {
      const { contractController, type } = getContractController(this.context, chainId);
      if (!contractController || !type) {
        return;
      }
      const txInfos = await Sqlite.getInstance().getTransactions(myAddress, type, chainId);
      if (!txInfos) {
        return;
      }
      await this.handleOneAccountTxs(chainId, myAddress, txInfos, contractController);
    } catch (error) {
      logDebug('refreshMyEventGroups error --> ', error);
    }
  }

  async refreshSingleChainAllowance(myAddress: string, chainId: string, contractController: AssetsContractController | BscContractController | PolygonContractController | ArbContractController | HecoContractController) {
    const releaseLock = await this.mutex.acquire();
    try {
      const tokenArray = [];
      const spenderArray = [];
      const { allEvents } = this.state;
      const tokenMap = allEvents?.[myAddress]?.[chainId] || {};
      for (const tokenAddr in tokenMap) {
        if (tokenMap[tokenAddr]) {
          const approvals = tokenMap?.[tokenAddr]?.approvals || {};
          for (const spenderAddr in approvals) {
            if (approvals[spenderAddr]) {
              tokenArray.push(tokenAddr);
              spenderArray.push(spenderAddr);
            }
          }
        }
      }
      if (tokenArray.length > 0) {
        const allowances = await contractController.getAllowancesInSingleCall(tokenArray, spenderArray, myAddress, chainId);
        if (allowances && allowances.length === tokenArray.length) {
          const newEventGroups = allEvents[myAddress];
          for (let i = 0; i < tokenArray.length; i++) {
            this.updateEventAllowance(newEventGroups, chainId, tokenArray[i], spenderArray[i], allowances[i]);
          }
          const oldAllEvents = this.state.allEvents;
          const newAllEvents = { ...oldAllEvents, [myAddress]: newEventGroups };
          this.update({ allEvents: newAllEvents, updateTime: Date.now() });
        }
      }
    } finally {
      releaseLock();
    }
  }

  async filterApprovalEventForAddress(chainId: string, selectedAddress: string) {
    try {
      const { contractController, type } = getContractController(this.context, chainId);
      if (!contractController || !type || !selectedAddress) {
        return;
      }
      const transactions = await Sqlite.getInstance().getTransactions(selectedAddress, type, chainId);
      if (!transactions) {
        return;
      }
      await this.handleOneAccountTxs(chainId, selectedAddress, transactions, contractController);
    } catch (error) {
      logDebug('filterApprovalEventForAddress error --> ', error);
    }
  }

  async handleOneAccountTxs(chainId: string, myAddress: string, txInfos: TransactionInfo[], contractController: BscContractController | PolygonContractController | ArbContractController | HecoContractController) {
    const releaseLock = await this.mutex.acquire();
    try {
      const currentEventGroups = this.state.allEvents[myAddress] || {};
      const newEventGroups = { ...currentEventGroups };
      const approvalTxs = txInfos?.filter((tx: TransactionInfo) => {
        return tx.transactionHash && tx.status === TransactionStatus.confirmed && tx.transaction?.data?.startsWith(APPROVAL_METHOD_ID);
      }) || [];
      const tokenArray = [];
      const spenderArray = [];
      let hasNew = false;
      for (let i = approvalTxs.length - 1; i >= 0; i--) {
        const tx: any = approvalTxs[i];
        const token = tx.transaction?.to || '';
        let spender = tx.transaction?.data?.substr(34, 40) || '';
        let initAllowance = tx.transaction?.data?.substr(74) || '';
        const time = tx?.time;
        if (!token || !spender) {
          continue;
        }
        spender = `0x${spender}`;
        if (isZeroAddress(spender)) {
          continue;
        }
        initAllowance = `0x${initAllowance}`;
        tokenArray.push(token);
        spenderArray.push(spender);
        if (this.isNewEvent(token, spender, time, chainId, myAddress)) {
          hasNew = true;
          this.addOrReplaceEvent(newEventGroups, chainId, token, spender, initAllowance, time);
        }
      }
      if (!hasNew) {
        return;
      }
      if (tokenArray.length > 0) {
        const { tokens, spenders } = this.filterSame(tokenArray, spenderArray);
        const allowances = await contractController.getAllowancesInSingleCall(tokens, spenders, myAddress, chainId);
        if (allowances && allowances.length === tokens.length) {
          for (let i = 0; i < tokens.length; i++) {
            this.updateEventAllowance(newEventGroups, chainId, tokens[i], spenders[i], allowances[i]);
          }
        }
      }
      const oldAllEvents = this.state.allEvents;
      const newAllEvents = { ...oldAllEvents, [myAddress]: newEventGroups };
      this.update({ allEvents: newAllEvents, updateTime: Date.now() });
    } catch (error) {
      logDebug('handleOneAccountTxs error --> ', error);
    } finally {
      releaseLock();
    }
  }

  filterSame(tokenArray: string[], spenderArray: string[]): { tokens: string[]; spenders: string[] } {
    const tokenSpenderSet = new Set<string>();
    for (let i = 0; i < tokenArray.length; i++) {
      const t = tokenArray[i];
      const s = spenderArray[i];
      tokenSpenderSet.add(`${t}-${s}`);
    }
    const tokens: string[] = [];
    const spenders: string[] = [];
    tokenSpenderSet.forEach((ts) => {
      const strArr = ts.split('-');
      tokens.push(strArr[0]);
      spenders.push(strArr[1]);
    });
    return { tokens, spenders };
  }

  updateEventAllowance(eventGroups: { [key: string]: { [key: string]: EventGroup } }, chainId: string, token: string, spender: string, allowance: string) {
    const currChain = eventGroups[chainId];
    if (!currChain) {
      return;
    }
    const currGroup = currChain[token];
    if (!currGroup) {
      return;
    }
    const event = currGroup.approvals[spender];
    if (event) {
      if (parseFloat(allowance) === 0) {
        delete currGroup.approvals[spender];
      } else {
        event.allowance = parseFloat(allowance);
      }
    }
  }

  addOrReplaceEvent(eventGroups: { [key: string]: { [key: string]: EventGroup } }, chainId: string, token: string, spender: string, initAllowance: string, time: number) {
    let currChain = eventGroups[chainId];
    if (!currChain) {
      eventGroups[chainId] = {};
      currChain = eventGroups[chainId];
    }
    const currGroup = currChain[token];
    if (currGroup) {
      currGroup.approvals[spender] = {
        spender,
        initAllowance,
        allowance: 0,
        timestamp: time.toString(),
      };
    } else {
      currChain[token] = {
        token,
        chainId,
        approvals: {
          [spender]: { spender, initAllowance, allowance: 0, timestamp: time.toString() },
        },
      };
    }
  }

  isNewEvent(token: string, spender: string, time: number, chainId: string, myAddress: string): boolean {
    const myEventGroups = this.state.allEvents[myAddress];
    if (!myEventGroups) {
      return true;
    }
    const currChain = myEventGroups[chainId];
    if (!currChain) {
      return true;
    }
    const currGroup = currChain[token];
    if (!currGroup) {
      return true;
    }
    const currEvent = currGroup.approvals[spender];
    if (!currEvent) {
      return true;
    }
    if (time > parseFloat(currEvent.timestamp)) {
      return true;
    }
    return false;
  }

  isAddressSame(addressA: string, addressB: string): boolean {
    if (addressA === undefined || addressB === undefined) {
      return addressA === addressB;
    }
    return addressA.toLowerCase() === addressB.toLowerCase();
  }
}

export default ApprovalEventsController;
